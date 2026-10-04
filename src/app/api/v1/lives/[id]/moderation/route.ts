import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { liveBans, liveComments, liveModerators, liveSessions } from "@/db/schema";
import { requireRequestSession } from "@/lib/auth";
import { publishRealtimeBestEffort } from "@/lib/realtime";
const schema=z.discriminatedUnion("action",[
  z.object({action:z.literal("pin_comment"),commentId:z.uuid()}),
  z.object({action:z.literal("delete_comment"),commentId:z.uuid()}),
  z.object({action:z.literal("ban_user"),userId:z.uuid(),reason:z.string().trim().min(1).max(500).default("moderation")}),
  z.object({action:z.literal("unban_user"),userId:z.uuid()})
]);
async function canModerate(liveId:string,userId:string){
  const [live]=await db.select({hostId:liveSessions.hostId}).from(liveSessions).where(eq(liveSessions.id,liveId)).limit(1);
  if(!live)return false;if(live.hostId===userId)return true;
  const [mod]=await db.select({userId:liveModerators.userId}).from(liveModerators).where(and(eq(liveModerators.liveId,liveId),eq(liveModerators.userId,userId))).limit(1);
  return Boolean(mod);
}
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireRequestSession(req),{id}=await params,parsed=schema.safeParse(await req.json().catch(()=>null));
    if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Ação de moderação inválida."}},{status:422});
    if(!await canModerate(id,session.userId))return NextResponse.json({error:{code:"FORBIDDEN",message:"Sem permissão para moderar."}},{status:403});
    if(parsed.data.action==="pin_comment"){
      const commentId=parsed.data.commentId;
      await db.transaction(async tx=>{await tx.update(liveComments).set({pinned:false}).where(eq(liveComments.liveId,id));await tx.update(liveComments).set({pinned:true}).where(and(eq(liveComments.id,commentId),eq(liveComments.liveId,id)));});
    }else if(parsed.data.action==="delete_comment"){
      await db.update(liveComments).set({deletedAt:new Date()}).where(and(eq(liveComments.id,parsed.data.commentId),eq(liveComments.liveId,id)));
    }else if(parsed.data.action==="ban_user"){
      await db.insert(liveBans).values({liveId:id,userId:parsed.data.userId,actorId:session.userId,reason:parsed.data.reason}).onConflictDoUpdate({target:[liveBans.liveId,liveBans.userId],set:{actorId:session.userId,reason:parsed.data.reason,createdAt:new Date()}});
    }else{
      await db.delete(liveBans).where(and(eq(liveBans.liveId,id),eq(liveBans.userId,parsed.data.userId)));
    }
    await publishRealtimeBestEffort({channel:"live:"+id,event:"live.moderation.updated",data:{action:parsed.data.action,actorId:session.userId}});
    return NextResponse.json({data:{updated:true}});
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}
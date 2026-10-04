import { NextResponse } from "next/server";
import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { liveBans, liveComments, liveSessions, profiles, users } from "@/db/schema";
import { requireRequestSession } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { publishRealtimeBestEffort } from "@/lib/realtime";
const schema=z.object({body:z.string().trim().min(1).max(500)});
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const data=await db.select({id:liveComments.id,body:liveComments.body,pinned:liveComments.pinned,createdAt:liveComments.createdAt,authorId:users.id,username:users.username,displayName:profiles.displayName})
    .from(liveComments).innerJoin(users,eq(liveComments.authorId,users.id)).innerJoin(profiles,eq(users.id,profiles.userId))
    .where(and(eq(liveComments.liveId,id),isNull(liveComments.deletedAt))).orderBy(asc(liveComments.createdAt)).limit(300);
  return NextResponse.json({data});
}
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireRequestSession(req),{id}=await params,parsed=schema.safeParse(await req.json().catch(()=>null));
    if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Comentário inválido."}},{status:422});
    const [live]=await db.select({status:liveSessions.status}).from(liveSessions).where(eq(liveSessions.id,id)).limit(1);
    if(!live||live.status!=="live")return NextResponse.json({error:{code:"LIVE_INACTIVE",message:"Live indisponível."}},{status:409});
    const [ban]=await db.select({userId:liveBans.userId}).from(liveBans).where(and(eq(liveBans.liveId,id),eq(liveBans.userId,session.userId))).limit(1);
    if(ban)return NextResponse.json({error:{code:"LIVE_BANNED",message:"Você não pode comentar nesta live."}},{status:403});
    const [comment]=await db.insert(liveComments).values({liveId:id,authorId:session.userId,body:parsed.data.body}).returning({id:liveComments.id,createdAt:liveComments.createdAt});
    await publishRealtimeBestEffort({channel:"live:"+id,event:"live.comment.created",data:{id:comment.id,userId:session.userId,body:parsed.data.body,createdAt:comment.createdAt}});
    return NextResponse.json({data:comment},{status:201});
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}
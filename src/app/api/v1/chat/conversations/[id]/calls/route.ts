import { NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { calls, conversationMembers, conversations, notifications } from "@/db/schema";
import { requireRequestSession } from "@/lib/auth";
import { areUsersBlocked } from "@/services/social-guard";

const schema=z.object({type:z.enum(["voice","video"])});
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireRequestSession(req),{id:conversationId}=await params;
    const parsed=schema.safeParse(await req.json().catch(()=>null));
    if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Tipo de chamada inválido."}},{status:422});
    const [membership]=await db.select({type:conversations.type}).from(conversationMembers).innerJoin(conversations,eq(conversationMembers.conversationId,conversations.id))
      .where(and(eq(conversationMembers.conversationId,conversationId),eq(conversationMembers.userId,session.userId))).limit(1);
    if(!membership)return NextResponse.json({error:{code:"FORBIDDEN",message:"Sem acesso à conversa."}},{status:403});
    const recipients=await db.select({userId:conversationMembers.userId}).from(conversationMembers)
      .where(and(eq(conversationMembers.conversationId,conversationId),ne(conversationMembers.userId,session.userId)));
    if(membership.type==="direct"&&recipients[0]&&await areUsersBlocked(session.userId,recipients[0].userId))return NextResponse.json({error:{code:"BLOCKED",message:"Chamada indisponível."}},{status:403});
    const id=randomUUID(),rtcRoomName="call-"+id;
    await db.transaction(async tx=>{
      await tx.insert(calls).values({id,conversationId,callerId:session.userId,type:parsed.data.type,status:"ringing",rtcRoomName});
      if(recipients.length)await tx.insert(notifications).values(recipients.map(r=>({userId:r.userId,actorId:session.userId,type:"call_ringing",entityType:"call",entityId:id,payload:{callType:parsed.data.type,conversationId}})));
    });
    return NextResponse.json({data:{id,status:"ringing",rtcRoomName}},{status:201});
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}
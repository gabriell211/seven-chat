import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { calls, conversationMembers } from "@/db/schema";
import { requireSession } from "@/lib/auth";
const schema=z.object({type:z.enum(["voice","video"])});
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireSession(),{id:conversationId}=await params;
    const parsed=schema.safeParse(await req.json());
    if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Tipo de chamada inválido."}},{status:422});
    const [member]=await db.select({userId:conversationMembers.userId}).from(conversationMembers)
      .where(and(eq(conversationMembers.conversationId,conversationId),eq(conversationMembers.userId,session.userId))).limit(1);
    if(!member)return NextResponse.json({error:{code:"FORBIDDEN",message:"Sem acesso à conversa."}},{status:403});
    const id=randomUUID(),rtcRoomName="call-"+id;
    await db.insert(calls).values({id,conversationId,callerId:session.userId,type:parsed.data.type,status:"ringing",rtcRoomName});
    return NextResponse.json({data:{id,rtcRoomName,status:"ringing"}},{status:201});
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}
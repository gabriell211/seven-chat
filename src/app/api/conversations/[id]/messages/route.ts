import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { conversationMembers, messages } from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { messageSchema } from "@/lib/validation";
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireSession();
    const {id}=await params;
    const member=await db.select({userId:conversationMembers.userId}).from(conversationMembers)
      .where(and(eq(conversationMembers.conversationId,id),eq(conversationMembers.userId,session.userId))).limit(1);
    if(!member.length)return NextResponse.json({error:{code:"FORBIDDEN",message:"Sem acesso à conversa."}},{status:403});
    const parsed=messageSchema.safeParse(Object.fromEntries(await req.formData()));
    if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Mensagem inválida."}},{status:422});
    await db.insert(messages).values({
      conversationId:id,senderId:session.userId,type:parsed.data.type,body:parsed.data.body??null,
      mediaUrl:parsed.data.mediaUrl??null,viewOnce:parsed.data.viewOnce
    });
    return NextResponse.redirect(new URL("/chat",req.url),303);
  }catch{
    return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});
  }
}
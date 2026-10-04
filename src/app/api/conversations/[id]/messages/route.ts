import { NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { conversationMembers, conversations, mediaAssets, messages } from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { messageSchema } from "@/lib/validation";
import { hasVipAtLeast } from "@/services/entitlements";
import { areUsersBlocked } from "@/services/social-guard";

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireSession(),{id}=await params;
    const [membership]=await db.select({type:conversations.type}).from(conversationMembers)
      .innerJoin(conversations,eq(conversationMembers.conversationId,conversations.id))
      .where(and(eq(conversationMembers.conversationId,id),eq(conversationMembers.userId,session.userId))).limit(1);
    if(!membership)return NextResponse.json({error:{code:"FORBIDDEN",message:"Sem acesso à conversa."}},{status:403});

    const parsed=messageSchema.safeParse(Object.fromEntries(await req.formData()));
    if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Mensagem inválida."}},{status:422});
    if(parsed.data.type==="video"&&!(await hasVipAtLeast(session.userId,"vip"))){
      return NextResponse.json({error:{code:"VIP_REQUIRED",message:"Vídeo no chat exige VIP."}},{status:403});
    }
    if(membership.type==="direct"){
      const [other]=await db.select({userId:conversationMembers.userId}).from(conversationMembers)
        .where(and(eq(conversationMembers.conversationId,id),ne(conversationMembers.userId,session.userId))).limit(1);
      if(other&&await areUsersBlocked(session.userId,other.userId))return NextResponse.json({error:{code:"BLOCKED",message:"Mensagem indisponível."}},{status:403});
    }
    if(parsed.data.mediaAssetId){
      const [asset]=await db.select({id:mediaAssets.id,status:mediaAssets.status,purpose:mediaAssets.purpose}).from(mediaAssets)
        .where(and(eq(mediaAssets.id,parsed.data.mediaAssetId),eq(mediaAssets.ownerId,session.userId))).limit(1);
      if(!asset||asset.status!=="ready"||asset.purpose!=="chat")return NextResponse.json({error:{code:"MEDIA_NOT_READY",message:"Mídia ainda não está pronta."}},{status:409});
    }
    await db.insert(messages).values({
      conversationId:id,senderId:session.userId,type:parsed.data.type,body:parsed.data.body??null,
      mediaAssetId:parsed.data.mediaAssetId??null,viewOnce:parsed.data.viewOnce
    });
    return NextResponse.redirect(new URL("/chat",req.url),303);
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}
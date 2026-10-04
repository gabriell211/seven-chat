import { NextResponse } from "next/server";
import { and, desc, eq, isNull, lt, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { conversationMembers, conversations, mediaAssets, messages } from "@/db/schema";
import { requireRequestSession } from "@/lib/auth";
import { messageSchema } from "@/lib/validation";
import { hasVipAtLeast } from "@/services/entitlements";
import { areUsersBlocked } from "@/services/social-guard";
import { publishRealtimeBestEffort } from "@/lib/realtime";

async function membership(conversationId:string,userId:string){
  const [row]=await db.select({type:conversations.type}).from(conversationMembers)
    .innerJoin(conversations,eq(conversationMembers.conversationId,conversations.id))
    .where(and(eq(conversationMembers.conversationId,conversationId),eq(conversationMembers.userId,userId))).limit(1);
  return row;
}

export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireRequestSession(req),{id}=await params;
    if(!await membership(id,session.userId))return NextResponse.json({error:{code:"FORBIDDEN",message:"Sem acesso à conversa."}},{status:403});
    const rawCursor=new URL(req.url).searchParams.get("cursor"),cursor=rawCursor?new Date(rawCursor):null;
    if(cursor&&Number.isNaN(cursor.getTime()))return NextResponse.json({error:{code:"INVALID_CURSOR",message:"Cursor inválido."}},{status:422});
    const rows=await db.select({
      id:messages.id,senderId:messages.senderId,type:messages.type,body:messages.body,
      mediaAssetId:messages.mediaAssetId,viewOnce:messages.viewOnce,openedAt:messages.openedAt,
      createdAt:messages.createdAt,editedAt:messages.editedAt
    }).from(messages).where(and(eq(messages.conversationId,id),cursor?lt(messages.createdAt,cursor):undefined,isNull(messages.deletedAt)))
      .orderBy(desc(messages.createdAt)).limit(51);
    const page=rows.slice(0,50);
    return NextResponse.json({data:page,nextCursor:rows.length>50?page.at(-1)?.createdAt.toISOString()??null:null});
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireRequestSession(req),{id}=await params;
    const member=await membership(id,session.userId);
    if(!member)return NextResponse.json({error:{code:"FORBIDDEN",message:"Sem acesso à conversa."}},{status:403});
    const contentType=req.headers.get("content-type")??"";
    const input=contentType.includes("application/json")?await req.json():Object.fromEntries(await req.formData());
    const parsed=messageSchema.safeParse(input);
    if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Mensagem inválida."}},{status:422});
    if(parsed.data.type==="video"&&!(await hasVipAtLeast(session.userId,"vip")))return NextResponse.json({error:{code:"VIP_REQUIRED",message:"Vídeo no chat exige VIP."}},{status:403});
    if(member.type==="direct"){
      const [other]=await db.select({userId:conversationMembers.userId}).from(conversationMembers)
        .where(and(eq(conversationMembers.conversationId,id),ne(conversationMembers.userId,session.userId))).limit(1);
      if(other&&await areUsersBlocked(session.userId,other.userId))return NextResponse.json({error:{code:"BLOCKED",message:"Mensagem indisponível."}},{status:403});
    }
    if(parsed.data.mediaAssetId){
      const [asset]=await db.select({id:mediaAssets.id,purpose:mediaAssets.purpose,status:mediaAssets.status}).from(mediaAssets)
        .where(and(eq(mediaAssets.id,parsed.data.mediaAssetId),eq(mediaAssets.ownerId,session.userId))).limit(1);
      if(!asset||asset.purpose!=="chat"||asset.status!=="ready")return NextResponse.json({error:{code:"MEDIA_NOT_READY",message:"Mídia ainda não está pronta."}},{status:409});
    }
    const [message]=await db.insert(messages).values({
      conversationId:id,senderId:session.userId,type:parsed.data.type,body:parsed.data.body??null,
      mediaAssetId:parsed.data.mediaAssetId??null,viewOnce:parsed.data.viewOnce
    }).returning({id:messages.id,createdAt:messages.createdAt});
    await publishRealtimeBestEffort({
      channel:"conversation:"+id,event:"message.created",
      data:{id:message.id,conversationId:id,senderId:session.userId,type:parsed.data.type,createdAt:message.createdAt.toISOString()}
    });
    return NextResponse.json({data:message},{status:201});
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}
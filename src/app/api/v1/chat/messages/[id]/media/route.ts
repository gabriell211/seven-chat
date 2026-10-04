import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { conversationMembers, mediaAssets, messages } from "@/db/schema";
import { requireRequestSession } from "@/lib/auth";
import { createDownloadUrl } from "@/lib/storage";

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireRequestSession(req),{id}=await params;
    const [row]=await db.select({
      messageId:messages.id,senderId:messages.senderId,conversationId:messages.conversationId,
      assetId:messages.mediaAssetId,viewOnce:messages.viewOnce,openedAt:messages.openedAt,
      objectKey:mediaAssets.objectKey,assetStatus:mediaAssets.status
    }).from(messages).leftJoin(mediaAssets,eq(messages.mediaAssetId,mediaAssets.id))
      .where(eq(messages.id,id)).limit(1);
    if(!row?.assetId||!row.objectKey||row.assetStatus!=="ready")return NextResponse.json({error:{code:"MEDIA_NOT_FOUND",message:"Mídia indisponível."}},{status:404});
    const [member]=await db.select({userId:conversationMembers.userId}).from(conversationMembers)
      .where(and(eq(conversationMembers.conversationId,row.conversationId),eq(conversationMembers.userId,session.userId))).limit(1);
    if(!member)return NextResponse.json({error:{code:"FORBIDDEN",message:"Sem acesso à mídia."}},{status:403});
    if(row.viewOnce&&row.senderId!==session.userId){
      const opened=await db.update(messages).set({openedAt:new Date()})
        .where(and(eq(messages.id,id),eq(messages.openedAt,null as never))).returning({id:messages.id});
      if(!opened.length)return NextResponse.json({error:{code:"VIEW_ONCE_EXPIRED",message:"Esta mídia já foi aberta."}},{status:410});
    }
    const expiresIn=row.viewOnce?30:300;
    return NextResponse.json({data:{url:await createDownloadUrl(row.objectKey,expiresIn),expiresIn,viewOnce:row.viewOnce}});
  }catch(error){
    const code=error instanceof Error?error.message:"MEDIA_FAILED";
    return NextResponse.json({error:{code,message:"Não foi possível abrir a mídia."}},{status:code==="STORAGE_NOT_CONFIGURED"?503:401});
  }
}
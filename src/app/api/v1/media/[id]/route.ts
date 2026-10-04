import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { mediaAssets } from "@/db/schema";
import { requireRequestSession } from "@/lib/auth";

export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireRequestSession(req),{id}=await params;
    const [asset]=await db.select({
      id:mediaAssets.id,purpose:mediaAssets.purpose,status:mediaAssets.status,
      detectedMime:mediaAssets.detectedMime,width:mediaAssets.width,height:mediaAssets.height,
      durationMs:mediaAssets.durationMs,moderationStatus:mediaAssets.moderationStatus,updatedAt:mediaAssets.updatedAt
    }).from(mediaAssets).where(and(eq(mediaAssets.id,id),eq(mediaAssets.ownerId,session.userId))).limit(1);
    if(!asset)return NextResponse.json({error:{code:"NOT_FOUND",message:"Mídia não encontrada."}},{status:404});
    return NextResponse.json({data:asset});
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}
import { NextResponse } from "next/server";
import { and, desc, eq, lt } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { mediaAssets, profiles, reels, users } from "@/db/schema";
import { requireRequestSession } from "@/lib/auth";
const schema=z.object({caption:z.string().trim().max(2200).default(""),mediaAssetId:z.uuid(),thumbnailAssetId:z.uuid().optional(),durationMs:z.number().int().positive().max(10*60*1000),visibility:z.enum(["public","followers","private"]).default("public")});
export async function GET(req:Request){
  const cursorRaw=new URL(req.url).searchParams.get("cursor"),cursor=cursorRaw?new Date(cursorRaw):null;
  if(cursor&&Number.isNaN(cursor.getTime()))return NextResponse.json({error:{code:"INVALID_CURSOR",message:"Cursor inválido."}},{status:422});
  const rows=await db.select({
    id:reels.id,caption:reels.caption,mediaAssetId:reels.mediaAssetId,thumbnailAssetId:reels.thumbnailAssetId,
    durationMs:reels.durationMs,viewCount:reels.viewCount,createdAt:reels.createdAt,
    authorId:users.id,username:users.username,displayName:profiles.displayName,avatarUrl:profiles.avatarUrl
  }).from(reels).innerJoin(users,eq(reels.authorId,users.id)).innerJoin(profiles,eq(reels.authorId,profiles.userId))
    .where(and(eq(reels.visibility,"public"),cursor?lt(reels.createdAt,cursor):undefined)).orderBy(desc(reels.createdAt)).limit(21);
  const page=rows.slice(0,20);
  return NextResponse.json({data:page,nextCursor:rows.length>20?page.at(-1)?.createdAt.toISOString()??null:null});
}
export async function POST(req:Request){
  try{
    const session=await requireRequestSession(req),parsed=schema.safeParse(await req.json());
    if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Reel inválido."}},{status:422});
    const assets=await db.select({id:mediaAssets.id,purpose:mediaAssets.purpose,status:mediaAssets.status}).from(mediaAssets)
      .where(and(eq(mediaAssets.ownerId,session.userId),eq(mediaAssets.status,"ready")));
    const video=assets.find(v=>v.id===parsed.data.mediaAssetId&&v.purpose==="reel");
    const thumbOk=!parsed.data.thumbnailAssetId||assets.some(v=>v.id===parsed.data.thumbnailAssetId);
    if(!video||!thumbOk)return NextResponse.json({error:{code:"MEDIA_NOT_READY",message:"Mídia do reel não está pronta."}},{status:409});
    const [reel]=await db.insert(reels).values({
      authorId:session.userId,caption:parsed.data.caption,mediaAssetId:parsed.data.mediaAssetId,
      thumbnailAssetId:parsed.data.thumbnailAssetId,durationMs:parsed.data.durationMs,visibility:parsed.data.visibility
    }).returning({id:reels.id,createdAt:reels.createdAt});
    return NextResponse.json({data:reel},{status:201});
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}
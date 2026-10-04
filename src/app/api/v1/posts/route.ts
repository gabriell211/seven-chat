import { NextResponse } from "next/server";
import { and, desc, eq, lt } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { mediaAssets, posts, profiles, users } from "@/db/schema";
import { getRequestSession, requireRequestSession } from "@/lib/auth";

const createSchema=z.object({
  body:z.string().trim().max(4000).default(""),
  visibility:z.enum(["public","followers","private"]).default("public"),
  commentsEnabled:z.boolean().default(true),
  mediaAssetIds:z.array(z.uuid()).max(10).default([])
}).refine(v=>v.body.length>0||v.mediaAssetIds.length>0,{message:"Publicação vazia."});

export async function GET(req:Request){
  const session=await getRequestSession(req);
  const raw=new URL(req.url).searchParams.get("cursor"),cursor=raw?new Date(raw):null;
  if(cursor&&Number.isNaN(cursor.getTime()))return NextResponse.json({error:{code:"INVALID_CURSOR",message:"Cursor inválido."}},{status:422});
  const rows=await db.select({
    id:posts.id,body:posts.body,media:posts.media,visibility:posts.visibility,commentsEnabled:posts.commentsEnabled,
    createdAt:posts.createdAt,updatedAt:posts.updatedAt,authorId:users.id,username:users.username,
    displayName:profiles.displayName,avatarUrl:profiles.avatarUrl
  }).from(posts).innerJoin(users,eq(posts.authorId,users.id)).innerJoin(profiles,eq(posts.authorId,profiles.userId))
    .where(and(eq(posts.visibility,"public"),cursor?lt(posts.createdAt,cursor):undefined))
    .orderBy(desc(posts.createdAt)).limit(21);
  const page=rows.slice(0,20);
  return NextResponse.json({data:page,nextCursor:rows.length>20?page.at(-1)?.createdAt.toISOString()??null:null,viewerId:session?.userId??null});
}

export async function POST(req:Request){
  try{
    const session=await requireRequestSession(req),parsed=createSchema.safeParse(await req.json().catch(()=>null));
    if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Publicação inválida."}},{status:422});
    const ids=[...new Set(parsed.data.mediaAssetIds)];
    const assets=ids.length?await db.select({id:mediaAssets.id,mime:mediaAssets.detectedMime,declaredMime:mediaAssets.declaredMime,purpose:mediaAssets.purpose,status:mediaAssets.status})
      .from(mediaAssets).where(and(eq(mediaAssets.ownerId,session.userId),eq(mediaAssets.status,"ready"))):[];
    if(assets.length!==ids.length||assets.some(a=>a.purpose!=="post"))return NextResponse.json({error:{code:"MEDIA_NOT_READY",message:"Uma ou mais mídias não estão prontas."}},{status:409});
    const media=ids.map(id=>{const a=assets.find(v=>v.id===id)!;const mime=a.mime??a.declaredMime;return {assetId:id,type:mime.startsWith("video/")?"video":"image"};});
    const [post]=await db.insert(posts).values({authorId:session.userId,body:parsed.data.body,media,visibility:parsed.data.visibility,commentsEnabled:parsed.data.commentsEnabled})
      .returning({id:posts.id,createdAt:posts.createdAt});
    return NextResponse.json({data:post},{status:201});
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}
import { NextResponse } from "next/server";
import { and, desc, eq, gt } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { mediaAssets, profiles, stories, users } from "@/db/schema";
import { getRequestSession, requireRequestSession } from "@/lib/auth";

const schema=z.object({
  type:z.enum(["text","image","video"]),
  textContent:z.string().trim().max(2000).optional(),
  mediaAssetId:z.uuid().optional()
}).refine(v=>v.type==="text"?Boolean(v.textContent):Boolean(v.mediaAssetId),{message:"Conteúdo do story ausente."});

export async function GET(req:Request){
  const session=await getRequestSession(req);
  const data=await db.select({
    id:stories.id,type:stories.type,textContent:stories.textContent,mediaAssetId:stories.mediaAssetId,
    expiresAt:stories.expiresAt,createdAt:stories.createdAt,authorId:users.id,
    username:users.username,displayName:profiles.displayName,avatarUrl:profiles.avatarUrl
  }).from(stories).innerJoin(users,eq(stories.authorId,users.id)).innerJoin(profiles,eq(stories.authorId,profiles.userId))
    .where(gt(stories.expiresAt,new Date())).orderBy(desc(stories.createdAt)).limit(100);
  return NextResponse.json({data,viewerId:session?.userId??null});
}
export async function POST(req:Request){
  try{
    const session=await requireRequestSession(req),parsed=schema.safeParse(await req.json());
    if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Story inválido."}},{status:422});
    if(parsed.data.mediaAssetId){
      const [asset]=await db.select({id:mediaAssets.id,status:mediaAssets.status,purpose:mediaAssets.purpose}).from(mediaAssets)
        .where(and(eq(mediaAssets.id,parsed.data.mediaAssetId),eq(mediaAssets.ownerId,session.userId))).limit(1);
      if(!asset||asset.status!=="ready"||asset.purpose!=="story")return NextResponse.json({error:{code:"MEDIA_NOT_READY",message:"Mídia do story não está pronta."}},{status:409});
    }
    const [story]=await db.insert(stories).values({
      authorId:session.userId,type:parsed.data.type,textContent:parsed.data.textContent,
      mediaAssetId:parsed.data.mediaAssetId,expiresAt:new Date(Date.now()+24*60*60*1000)
    }).returning({id:stories.id,expiresAt:stories.expiresAt});
    return NextResponse.json({data:story},{status:201});
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}
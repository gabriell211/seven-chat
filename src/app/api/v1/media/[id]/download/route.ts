import { NextResponse } from "next/server";
import { and, eq, gt, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { mediaAssets, posts, reels, stories } from "@/db/schema";
import { getRequestSession } from "@/lib/auth";
import { createDownloadUrl } from "@/lib/storage";

export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await getRequestSession(req),{id}=await params;
    const [asset]=await db.select({
      id:mediaAssets.id,ownerId:mediaAssets.ownerId,objectKey:mediaAssets.objectKey,status:mediaAssets.status,purpose:mediaAssets.purpose
    }).from(mediaAssets).where(and(eq(mediaAssets.id,id),eq(mediaAssets.status,"ready"))).limit(1);
    if(!asset)return NextResponse.json({error:{code:"NOT_FOUND",message:"Mídia indisponível."}},{status:404});

    if(session?.userId===asset.ownerId){
      return NextResponse.json({data:{url:await createDownloadUrl(asset.objectKey,300),expiresIn:300}});
    }

    let publicUse=false;
    if(asset.purpose==="reel"){
      const found=await db.select({id:reels.id}).from(reels)
        .where(and(eq(reels.visibility,"public"),or(eq(reels.mediaAssetId,id),eq(reels.thumbnailAssetId,id)))).limit(1);
      publicUse=found.length>0;
    }else if(asset.purpose==="story"){
      const found=await db.select({id:stories.id}).from(stories)
        .where(and(eq(stories.mediaAssetId,id),gt(stories.expiresAt,new Date()))).limit(1);
      publicUse=found.length>0;
    }else if(asset.purpose==="post"){
      const found=await db.select({id:posts.id}).from(posts)
        .where(and(eq(posts.visibility,"public"),sql`${posts.media} @> ${JSON.stringify([{assetId:id}])}::jsonb`)).limit(1);
      publicUse=found.length>0;
    }

    if(!publicUse)return NextResponse.json({error:{code:"FORBIDDEN",message:"Sem acesso à mídia."}},{status:403});
    return NextResponse.json({data:{url:await createDownloadUrl(asset.objectKey,120),expiresIn:120}});
  }catch(error){
    const code=error instanceof Error?error.message:"MEDIA_FAILED";
    return NextResponse.json({error:{code,message:"Não foi possível acessar a mídia."}},{status:code==="STORAGE_NOT_CONFIGURED"?503:500});
  }
}
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { mediaAssets } from "@/db/schema";
import { requireRequestSession } from "@/lib/auth";
import { createDownloadUrl } from "@/lib/storage";
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireRequestSession(req),{id}=await params;
    const [asset]=await db.select().from(mediaAssets).where(and(eq(mediaAssets.id,id),eq(mediaAssets.ownerId,session.userId),eq(mediaAssets.status,"ready"))).limit(1);
    if(!asset)return NextResponse.json({error:{code:"NOT_FOUND",message:"Mídia indisponível."}},{status:404});
    return NextResponse.json({data:{url:await createDownloadUrl(asset.objectKey,60),expiresIn:60}});
  }catch(error){
    const code=error instanceof Error?error.message:"MEDIA_FAILED";
    return NextResponse.json({error:{code,message:"Não foi possível acessar a mídia."}},{status:code==="STORAGE_NOT_CONFIGURED"?503:401});
  }
}
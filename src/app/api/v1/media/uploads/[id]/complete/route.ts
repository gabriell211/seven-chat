import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { mediaAssets, mediaProcessingJobs } from "@/db/schema";
import { requireRequestSession } from "@/lib/auth";
import { headPrivateObject } from "@/lib/storage";

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireRequestSession(req),{id}=await params;
    const [asset]=await db.select().from(mediaAssets).where(and(eq(mediaAssets.id,id),eq(mediaAssets.ownerId,session.userId))).limit(1);
    if(!asset)return NextResponse.json({error:{code:"NOT_FOUND",message:"Asset não encontrado."}},{status:404});
    if(asset.status!=="pending_upload")return NextResponse.json({data:{id:asset.id,status:asset.status}});
    const head=await headPrivateObject(asset.objectKey);
    if(Number(head.ContentLength??-1)!==asset.sizeBytes||head.ContentType!==asset.declaredMime){
      await db.update(mediaAssets).set({status:"rejected",updatedAt:new Date()}).where(eq(mediaAssets.id,id));
      return NextResponse.json({error:{code:"MEDIA_METADATA_MISMATCH",message:"Arquivo enviado não corresponde ao upload autorizado."}},{status:422});
    }
    await db.transaction(async tx=>{
      await tx.update(mediaAssets).set({status:"processing",updatedAt:new Date()}).where(eq(mediaAssets.id,id));
      for(const type of ["inspect_magic_bytes","strip_metadata","malware_scan","thumbnail_or_transcode"]){
        await tx.insert(mediaProcessingJobs).values({assetId:id,type});
      }
    });
    return NextResponse.json({data:{id,status:"processing"}});
  }catch(error){
    const code=error instanceof Error?error.message:"UPLOAD_FINALIZE_FAILED";
    return NextResponse.json({error:{code,message:"Não foi possível finalizar o upload."}},{status:code==="STORAGE_NOT_CONFIGURED"?503:401});
  }
}
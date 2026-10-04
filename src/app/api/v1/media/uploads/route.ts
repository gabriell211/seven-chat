import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { mediaAssets } from "@/db/schema";
import { requireRequestSession } from "@/lib/auth";
import { createUploadUrl } from "@/lib/storage";

const schema=z.object({
  purpose:z.enum(["avatar","banner","post","story","reel","chat","live_thumbnail"]),
  mime:z.enum(["image/jpeg","image/png","image/webp","image/gif","video/mp4","video/webm","audio/mpeg","audio/mp4","audio/ogg"]),
  sizeBytes:z.number().int().positive().max(100*1024*1024)
});
const ext:Record<string,string>={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/gif":"gif","video/mp4":"mp4","video/webm":"webm","audio/mpeg":"mp3","audio/mp4":"m4a","audio/ogg":"ogg"};

export async function POST(req:Request){
  try{
    const session=await requireRequestSession(req);
    const parsed=schema.safeParse(await req.json());
    if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Upload inválido."}},{status:422});
    const id=randomUUID(),objectKey=`users/${session.userId}/${parsed.data.purpose}/${id}.${ext[parsed.data.mime]}`;
    const [asset]=await db.insert(mediaAssets).values({
      id,ownerId:session.userId,objectKey,purpose:parsed.data.purpose,
      declaredMime:parsed.data.mime,sizeBytes:parsed.data.sizeBytes,status:"pending_upload"
    }).returning({id:mediaAssets.id});
    const uploadUrl=await createUploadUrl({key:objectKey,contentType:parsed.data.mime,sizeBytes:parsed.data.sizeBytes});
    return NextResponse.json({data:{assetId:asset.id,uploadUrl,expiresIn:300,requiredHeaders:{"content-type":parsed.data.mime}}},{status:201});
  }catch(error){
    const code=error instanceof Error?error.message:"UPLOAD_FAILED";
    const status=code==="UNAUTHORIZED"?401:code==="STORAGE_NOT_CONFIGURED"?503:500;
    return NextResponse.json({error:{code:status===500?"UPLOAD_FAILED":code,message:code==="STORAGE_NOT_CONFIGURED"?"Storage privado não configurado.":"Não foi possível autorizar o upload."}},{status});
  }
}
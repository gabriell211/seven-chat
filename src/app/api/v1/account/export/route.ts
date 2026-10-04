import { NextResponse } from "next/server";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { dataExportRequests } from "@/db/schema";
import { requireRequestSession } from "@/lib/auth";
import { createDownloadUrl } from "@/lib/storage";

export async function GET(req:Request){
  try{
    const session=await requireRequestSession(req);
    const [row]=await db.select().from(dataExportRequests).where(eq(dataExportRequests.userId,session.userId))
      .orderBy(desc(dataExportRequests.requestedAt)).limit(1);
    if(!row)return NextResponse.json({data:null});
    let download:null|{url:string;expiresIn:number}=null;
    if(row.status==="ready"&&row.objectKey&&row.expiresAt&&row.expiresAt>new Date()){
      download={url:await createDownloadUrl(row.objectKey,300),expiresIn:300};
    }
    return NextResponse.json({data:{id:row.id,status:row.status,requestedAt:row.requestedAt,completedAt:row.completedAt,expiresAt:row.expiresAt,download}});
  }catch(error){
    const code=error instanceof Error?error.message:"UNAUTHORIZED";
    return NextResponse.json({error:{code,message:code==="STORAGE_NOT_CONFIGURED"?"Storage não configurado.":"Faça login."}},{status:code==="STORAGE_NOT_CONFIGURED"?503:401});
  }
}
export async function POST(req:Request){
  try{
    const session=await requireRequestSession(req);
    const existing=await db.select({id:dataExportRequests.id,status:dataExportRequests.status}).from(dataExportRequests)
      .where(eq(dataExportRequests.userId,session.userId)).orderBy(desc(dataExportRequests.requestedAt)).limit(1);
    if(existing[0]&&["queued","processing"].includes(existing[0].status))return NextResponse.json({data:existing[0]},{status:202});
    const [row]=await db.insert(dataExportRequests).values({userId:session.userId}).returning({id:dataExportRequests.id,status:dataExportRequests.status,requestedAt:dataExportRequests.requestedAt});
    return NextResponse.json({data:row},{status:202});
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}
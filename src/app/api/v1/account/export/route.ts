import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
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
    const code=error instanceof Error?error.message:"EXPORT_FAILED";
    const status=code==="UNAUTHORIZED"?401:code==="STORAGE_NOT_CONFIGURED"?503:500;
    return NextResponse.json({error:{code:status===500?"EXPORT_FAILED":code,message:code==="STORAGE_NOT_CONFIGURED"?"Storage não configurado.":status===401?"Faça login.":"Não foi possível consultar a exportação."}},{status});
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
  }catch(error){
    const code=error instanceof Error?error.message:"EXPORT_REQUEST_FAILED";
    if(code==="UNAUTHORIZED")return NextResponse.json({error:{code,message:"Faça login."}},{status:401});
    return NextResponse.json({error:{code:"EXPORT_REQUEST_FAILED",message:"Não foi possível solicitar a exportação."}},{status:500});
  }
}
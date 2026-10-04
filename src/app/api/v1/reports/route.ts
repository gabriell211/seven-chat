import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reports } from "@/db/schema";
import { requireRequestSession } from "@/lib/auth";
import { reportSchema } from "@/lib/validation";

export async function POST(req:Request){
  try{
    const session=await requireRequestSession(req);
    const parsed=reportSchema.safeParse(await req.json().catch(()=>null));
    if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Denúncia inválida."}},{status:422});
    const [report]=await db.insert(reports).values({reporterId:session.userId,...parsed.data}).returning({id:reports.id,status:reports.status});
    return NextResponse.json({data:report},{status:201});
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}
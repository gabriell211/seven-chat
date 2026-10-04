import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reports } from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { reportSchema } from "@/lib/validation";
import { enforceRateLimit } from "@/lib/rate-limit";
export async function POST(req:Request){
  try{
    const session=await requireSession();
    const limited=await enforceRateLimit(req,"report",session.userId); if(limited)return limited;
    const parsed=reportSchema.safeParse(await req.json());
    if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Denúncia inválida."}},{status:422});
    const [report]=await db.insert(reports).values({reporterId:session.userId,...parsed.data}).returning({id:reports.id});
    return NextResponse.json({data:report},{status:201});
  }catch{
    return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});
  }
}
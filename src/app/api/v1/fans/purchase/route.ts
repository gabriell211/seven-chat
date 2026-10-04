import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRequestSession } from "@/lib/auth";
import { buyMegaFan, FanError } from "@/services/fans";
const schema=z.object({creatorUserId:z.uuid(),productCode:z.string().min(1).max(80),idempotencyKey:z.string().min(16).max(128)});
export async function POST(req:Request){
  try{
    const session=await requireRequestSession(req),parsed=schema.safeParse(await req.json());
    if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Compra inválida."}},{status:422});
    const data=await buyMegaFan({fanUserId:session.userId,...parsed.data});
    return NextResponse.json({data},{status:201});
  }catch(error){
    if(error instanceof FanError)return NextResponse.json({error:{code:error.code,message:error.message}},{status:["INSUFFICIENT_BALANCE","FAN_RETRY"].includes(error.code)?409:422});
    return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});
  }
}
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRequestSession } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { AdRewardError, createRewardIntent, getRewardedAdCatalog } from "@/services/admob";

const schema=z.object({adUnitId:z.string().min(3).max(200)});
export async function GET(){
  try{return NextResponse.json({data:getRewardedAdCatalog()});}
  catch(error){return NextResponse.json({error:{code:"REWARD_NOT_CONFIGURED",message:error instanceof Error?error.message:"Rewards indisponíveis."}},{status:503});}
}
export async function POST(req:Request){
  try{
    const session=await requireRequestSession(req);
    const limited=await enforceRateLimit(req,"write",session.userId);if(limited)return limited;
    const parsed=schema.safeParse(await req.json());
    if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Ad unit inválido."}},{status:422});
    return NextResponse.json({data:await createRewardIntent(session.userId,parsed.data.adUnitId)});
  }catch(error){
    if(error instanceof AdRewardError)return NextResponse.json({error:{code:error.code,message:error.message}},{status:422});
    return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});
  }
}
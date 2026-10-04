import { NextResponse } from "next/server";
import { createRealtimeAccessToken, requireRequestSession } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
export async function POST(req:Request){
  try{
    const session=await requireRequestSession(req);
    const limited=await enforceRateLimit(req,"write",session.userId);if(limited)return limited;
    const url=process.env.NEXT_PUBLIC_REALTIME_URL;
    if(!url)return NextResponse.json({error:{code:"REALTIME_NOT_CONFIGURED",message:"Realtime não configurado."}},{status:503});
    return NextResponse.json({data:{token:await createRealtimeAccessToken(session),url,expiresIn:300}});
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}
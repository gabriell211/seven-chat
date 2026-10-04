import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRequestSession } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { PaymentError } from "@/services/payments";
import { StoreVerificationError, verifyAndFulfillApple } from "@/services/store-verification";

const schema=z.object({intentId:z.uuid(),signedTransaction:z.string().min(100)});
export async function POST(req:Request){
  try{
    const session=await requireRequestSession(req);
    const limited=await enforceRateLimit(req,"financial",session.userId); if(limited)return limited;
    const parsed=schema.safeParse(await req.json().catch(()=>null));
    if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Comprovante Apple inválido."}},{status:422});
    const data=await verifyAndFulfillApple({purchaserUserId:session.userId,...parsed.data});
    return NextResponse.json({data});
  }catch(error){
    if(error instanceof StoreVerificationError||error instanceof PaymentError){
      return NextResponse.json({error:{code:error.code,message:error.message}},{status:409});
    }
    return NextResponse.json({error:{code:"STORE_VERIFY_FAILED",message:"Não foi possível validar a compra."}},{status:500});
  }
}
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRequestSession } from "@/lib/auth";
import { StoreVerificationError, verifyAndFulfillApple, verifyAndFulfillGoogle } from "@/services/store-verification";
const schema=z.discriminatedUnion("provider",[
  z.object({provider:z.literal("apple"),purchaseIntentId:z.uuid(),signedTransaction:z.string().min(100)}),
  z.object({provider:z.literal("google"),purchaseIntentId:z.uuid(),purchaseToken:z.string().min(20)})
]);
export async function POST(req:Request){
  try{
    const session=await requireRequestSession(req),parsed=schema.safeParse(await req.json());
    if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Comprovante de compra inválido."}},{status:422});
    const data=parsed.data.provider==="apple"
      ?await verifyAndFulfillApple({purchaserUserId:session.userId,intentId:parsed.data.purchaseIntentId,signedTransaction:parsed.data.signedTransaction})
      :await verifyAndFulfillGoogle({purchaserUserId:session.userId,intentId:parsed.data.purchaseIntentId,purchaseToken:parsed.data.purchaseToken});
    return NextResponse.json({data});
  }catch(error){
    if(error instanceof StoreVerificationError)return NextResponse.json({error:{code:error.code,message:error.message}},{status:error.code.endsWith("NOT_CONFIGURED")?503:422});
    return NextResponse.json({error:{code:"PURCHASE_CONFIRMATION_FAILED",message:"Não foi possível confirmar a compra."}},{status:500});
  }
}
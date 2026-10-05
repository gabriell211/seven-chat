import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRequestSession } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createInfinitePayCheckout, InfinitePayError } from "@/services/infinitepay";
const schema=z.object({productType:z.enum(["diamonds","vip"]),sku:z.string().min(1).max(100),beneficiaryUserId:z.uuid().optional()});
export async function POST(req:Request){
 try{
  const session=await requireRequestSession(req);const limited=await enforceRateLimit(req,"financial",session.userId);if(limited)return limited;
  const parsed=schema.safeParse(await req.json());if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Compra inválida."}},{status:422});
  const origin=new URL(req.url).origin;const data=await createInfinitePayCheckout({purchaserUserId:session.userId,...parsed.data,origin});
  return NextResponse.json({data},{status:201});
 }catch(error){
  if(error instanceof InfinitePayError)return NextResponse.json({error:{code:error.code,message:error.message}},{status:error.code==="INFINITEPAY_NOT_CONFIGURED"?503:422});
  if(error instanceof Error&&error.message==="UNAUTHORIZED")return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});
  return NextResponse.json({error:{code:"CHECKOUT_FAILED",message:"Não foi possível iniciar o pagamento."}},{status:500});
 }
}

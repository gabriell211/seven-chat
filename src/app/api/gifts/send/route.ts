import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { GiftError, sendGift } from "@/services/gifts";
const schema=z.object({receiverId:z.uuid(),giftId:z.uuid(),quantity:z.number().int().min(1).max(100).default(1),idempotencyKey:z.string().min(16).max(128)});
export async function POST(req:Request){
  try{
    const session=await requireSession();
    const parsed=schema.safeParse(await req.json());
    if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Dados do gift inválidos."}},{status:422});
    const result=await sendGift({senderId:session.userId,...parsed.data});
    return NextResponse.json({data:result},{status:201});
  }catch(error){
    if(error instanceof GiftError){
      const status=error.code==="GIFT_INSUFFICIENT_BALANCE"?409:error.code==="GIFT_RETRY"?409:422;
      return NextResponse.json({error:{code:error.code,message:error.message}},{status});
    }
    return NextResponse.json({error:{code:"GIFT_FAILED",message:"Não foi possível enviar o gift."}},{status:500});
  }
}
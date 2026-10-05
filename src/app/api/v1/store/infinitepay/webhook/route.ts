import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { diamondPackages, purchaseIntents, vipPlans } from "@/db/schema";
import { checkInfinitePayPayment, InfinitePayError } from "@/services/infinitepay";
import { fulfillVerifiedPurchase, PaymentError } from "@/services/payments";
const schema=z.object({invoice_slug:z.string().min(1),amount:z.number().int().positive(),paid_amount:z.number().int().positive(),installments:z.number().int().positive(),capture_method:z.enum(["pix","credit_card"]),transaction_nsu:z.string().min(1),order_nsu:z.uuid(),receipt_url:z.string().url().optional(),items:z.array(z.unknown()).optional()});
export async function POST(req:Request){
 try{
  const parsed=schema.safeParse(await req.json());if(!parsed.success)return NextResponse.json({success:false,message:"Payload inválido"},{status:400});
  const body=parsed.data;
  const [intent]=await db.select().from(purchaseIntents).where(and(eq(purchaseIntents.id,body.order_nsu),eq(purchaseIntents.provider,"infinitepay"))).limit(1);
  if(!intent||intent.status!=="created"||intent.expiresAt<=new Date())return NextResponse.json({success:false,message:"Pedido não encontrado ou expirado"},{status:400});
  const rows=intent.productType==="diamonds"
   ?await db.select({priceMinor:diamondPackages.priceMinor,currency:diamondPackages.currency}).from(diamondPackages).where(and(eq(diamondPackages.sku,intent.sku),eq(diamondPackages.isActive,true))).limit(1)
   :await db.select({priceMinor:vipPlans.priceMinor,currency:vipPlans.currency}).from(vipPlans).where(and(eq(vipPlans.code,intent.sku),eq(vipPlans.isActive,true))).limit(1);
  const product=rows[0];if(!product||product.currency!=="BRL"||body.amount!==product.priceMinor)return NextResponse.json({success:false,message:"Valor do pedido divergente"},{status:400});
  const verified=await checkInfinitePayPayment({orderNsu:body.order_nsu,transactionNsu:body.transaction_nsu,slug:body.invoice_slug});
  if(verified.amount!==product.priceMinor)return NextResponse.json({success:false,message:"Valor confirmado divergente"},{status:400});
  await fulfillVerifiedPurchase({provider:"infinitepay",purchaserUserId:intent.purchaserUserId,beneficiaryUserId:intent.beneficiaryUserId,purchaseIntentId:intent.id,storeProductId:intent.sku,externalTransactionId:body.transaction_nsu,currency:"BRL",amountMinor:verified.amount,metadata:{invoiceSlug:body.invoice_slug,captureMethod:verified.capture_method,installments:verified.installments,receiptUrl:body.receipt_url}});
  return NextResponse.json({success:true,message:null});
 }catch(error){
  if(error instanceof InfinitePayError||error instanceof PaymentError)return NextResponse.json({success:false,message:error.message},{status:400});
  return NextResponse.json({success:false,message:"Falha ao processar pagamento"},{status:400});
 }
}

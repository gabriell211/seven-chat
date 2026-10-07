import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { diamondPackages, purchaseIntents, users, vipPlans } from "@/db/schema";
import { requireRequestSession } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { ensureSevenVipCatalog, isSevenVipCode } from "@/services/vip-catalog";
const schema=z.object({
  provider:z.enum(["apple","google"]),
  productType:z.enum(["diamonds","vip"]),
  sku:z.string().min(1).max(100),
  beneficiaryUserId:z.uuid().optional()
});
export async function POST(req:Request){
  try{
    const session=await requireRequestSession(req);
    const limited=await enforceRateLimit(req,"financial",session.userId); if(limited)return limited;
    const parsed=schema.safeParse(await req.json());
    if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Intenção de compra inválida."}},{status:422});
    if(parsed.data.productType==="vip"){
      await ensureSevenVipCatalog();
      if(!isSevenVipCode(parsed.data.sku))return NextResponse.json({error:{code:"PRODUCT_NOT_FOUND",message:"Plano VIP indisponível."}},{status:404});
    }
    const beneficiary=parsed.data.beneficiaryUserId??session.userId;
    if(parsed.data.productType==="diamonds"&&beneficiary!==session.userId)return NextResponse.json({error:{code:"DIAMONDS_NOT_GIFTABLE",message:"Diamantes não podem ser comprados para outra conta."}},{status:422});
    const [target]=await db.select({id:users.id}).from(users).where(and(eq(users.id,beneficiary),eq(users.status,"active"))).limit(1);
    if(!target)return NextResponse.json({error:{code:"BENEFICIARY_NOT_FOUND",message:"Destinatário indisponível."}},{status:404});
    const product=parsed.data.productType==="diamonds"
      ?await db.select({sku:diamondPackages.sku,storeProductIds:diamondPackages.storeProductIds}).from(diamondPackages).where(and(eq(diamondPackages.sku,parsed.data.sku),eq(diamondPackages.isActive,true))).limit(1)
      :await db.select({sku:vipPlans.code,storeProductIds:vipPlans.storeProductIds}).from(vipPlans).where(and(eq(vipPlans.code,parsed.data.sku),eq(vipPlans.isActive,true))).limit(1);
    if(!product.length)return NextResponse.json({error:{code:"PRODUCT_NOT_FOUND",message:"Produto indisponível."}},{status:404});
    const storeId=(product[0].storeProductIds as Record<string,unknown>)[parsed.data.provider];
    if(typeof storeId!=="string"||!storeId)return NextResponse.json({error:{code:"STORE_PRODUCT_NOT_CONFIGURED",message:"Produto não configurado nessa loja."}},{status:409});
    const [intent]=await db.insert(purchaseIntents).values({
      purchaserUserId:session.userId,beneficiaryUserId:beneficiary,provider:parsed.data.provider,
      productType:parsed.data.productType,sku:parsed.data.sku,expiresAt:new Date(Date.now()+30*60*1000)
    }).returning({id:purchaseIntents.id,expiresAt:purchaseIntents.expiresAt});
    return NextResponse.json({data:{purchaseIntentId:intent.id,appAccountToken:intent.id,obfuscatedExternalAccountId:intent.id,storeProductId:storeId,expiresAt:intent.expiresAt}},{status:201});
  }catch(error){
    const code=error instanceof Error?error.message:"STORE_INTENT_FAILED";
    if(code==="UNAUTHORIZED")return NextResponse.json({error:{code,message:"Faça login."}},{status:401});
    return NextResponse.json({error:{code:"STORE_INTENT_FAILED",message:"Não foi possível criar a intenção de compra."}},{status:500});
  }
}
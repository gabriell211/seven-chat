import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { diamondPackages, purchaseIntents, users, vipPlans } from "@/db/schema";

const API="https://api.checkout.infinitepay.io";
export class InfinitePayError extends Error{constructor(public readonly code:string,message:string){super(message);}}
function handle(){const value=process.env.INFINITEPAY_HANDLE?.trim().replace(/^\$/,"");if(!value)throw new InfinitePayError("INFINITEPAY_NOT_CONFIGURED","InfinitePay não configurada.");return value;}
export async function createInfinitePayCheckout(input:{purchaserUserId:string;productType:"diamonds"|"vip";sku:string;beneficiaryUserId?:string;origin:string}){
 const beneficiary=input.beneficiaryUserId??input.purchaserUserId;
 if(input.productType==="diamonds"&&beneficiary!==input.purchaserUserId)throw new InfinitePayError("DIAMONDS_NOT_GIFTABLE","Diamantes não podem ser comprados para outra conta.");
 const [target]=await db.select({id:users.id}).from(users).where(and(eq(users.id,beneficiary),eq(users.status,"active"))).limit(1);
 if(!target)throw new InfinitePayError("BENEFICIARY_NOT_FOUND","Destinatário indisponível.");
 const rows=input.productType==="diamonds"
  ?await db.select({sku:diamondPackages.sku,priceMinor:diamondPackages.priceMinor,currency:diamondPackages.currency}).from(diamondPackages).where(and(eq(diamondPackages.sku,input.sku),eq(diamondPackages.isActive,true))).limit(1)
  :await db.select({sku:vipPlans.code,priceMinor:vipPlans.priceMinor,currency:vipPlans.currency}).from(vipPlans).where(and(eq(vipPlans.code,input.sku),eq(vipPlans.isActive,true))).limit(1);
 const product=rows[0]; if(!product||product.currency!=="BRL"||product.priceMinor<=0)throw new InfinitePayError("PRODUCT_NOT_FOUND","Produto indisponível para pagamento em BRL.");
 const [intent]=await db.insert(purchaseIntents).values({purchaserUserId:input.purchaserUserId,beneficiaryUserId:beneficiary,provider:"infinitepay",productType:input.productType,sku:input.sku,expiresAt:new Date(Date.now()+30*60*1000)}).returning({id:purchaseIntents.id,expiresAt:purchaseIntents.expiresAt});
 const payload={handle:handle(),order_nsu:intent.id,redirect_url:`${input.origin}/payment/success`,webhook_url:`${input.origin}/api/v1/store/infinitepay/webhook`,items:[{quantity:1,price:product.priceMinor,description:input.productType==="diamonds"?`Seven Chat - ${input.sku}`:`Seven Chat VIP - ${input.sku}`}]};
 const response=await fetch(`${API}/links`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload),cache:"no-store"});
 const data=await response.json().catch(()=>null) as {url?:string}|null;
 if(!response.ok||!data?.url)throw new InfinitePayError("CHECKOUT_CREATE_FAILED","Não foi possível criar o checkout InfinitePay.");
 return {purchaseIntentId:intent.id,checkoutUrl:data.url,expiresAt:intent.expiresAt};
}
export async function checkInfinitePayPayment(input:{orderNsu:string;transactionNsu:string;slug:string}){
 const response=await fetch(`${API}/payment_check`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({handle:handle(),order_nsu:input.orderNsu,transaction_nsu:input.transactionNsu,slug:input.slug}),cache:"no-store"});
 const data=await response.json().catch(()=>null) as {success?:boolean;paid?:boolean;amount?:number;paid_amount?:number;installments?:number;capture_method?:string}|null;
 if(!response.ok||!data?.success||!data.paid)throw new InfinitePayError("PAYMENT_NOT_CONFIRMED","Pagamento ainda não foi confirmado pela InfinitePay.");
 return data;
}

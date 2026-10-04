import { createHash } from "node:crypto";
import { Environment, SignedDataVerifier } from "@apple/app-store-server-library";
import { GoogleAuth } from "google-auth-library";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { diamondPackages, purchaseIntents, vipPlans } from "@/db/schema";
import { fulfillVerifiedPurchase } from "@/services/payments";

export class StoreVerificationError extends Error{constructor(public readonly code:string,message:string){super(message);}}

async function loadIntent(intentId:string,purchaserUserId:string,provider:"apple"|"google"){
  const [intent]=await db.select().from(purchaseIntents).where(and(
    eq(purchaseIntents.id,intentId),eq(purchaseIntents.purchaserUserId,purchaserUserId),
    eq(purchaseIntents.provider,provider),eq(purchaseIntents.status,"created"),gt(purchaseIntents.expiresAt,new Date())
  )).limit(1);
  if(!intent)throw new StoreVerificationError("PURCHASE_INTENT_INVALID","Intenção de compra inválida ou expirada.");
  const rows=intent.productType==="diamonds"
    ?await db.select({storeProductIds:diamondPackages.storeProductIds}).from(diamondPackages).where(and(eq(diamondPackages.sku,intent.sku),eq(diamondPackages.isActive,true))).limit(1)
    :await db.select({storeProductIds:vipPlans.storeProductIds}).from(vipPlans).where(and(eq(vipPlans.code,intent.sku),eq(vipPlans.isActive,true))).limit(1);
  const storeProductId=(rows[0]?.storeProductIds as Record<string,unknown>|undefined)?.[provider];
  if(typeof storeProductId!=="string"||!storeProductId)throw new StoreVerificationError("STORE_PRODUCT_NOT_CONFIGURED","Produto não configurado para a loja.");
  return {intent,storeProductId};
}

function appleVerifier(){
  const bundleId=process.env.APPLE_BUNDLE_ID;
  const encoded=process.env.APPLE_ROOT_CA_BASE64;
  if(!bundleId||!encoded)throw new StoreVerificationError("APPLE_NOT_CONFIGURED","Validação Apple não configurada.");
  const roots=encoded.split(";").filter(Boolean).map(v=>Buffer.from(v,"base64"));
  if(!roots.length)throw new StoreVerificationError("APPLE_NOT_CONFIGURED","Certificados raiz Apple ausentes.");
  const production=(process.env.APPLE_ENVIRONMENT??"Sandbox").toLowerCase()==="production";
  const environment=production?Environment.PRODUCTION:Environment.SANDBOX;
  const appId=production?Number(process.env.APPLE_APP_ID):undefined;
  if(production&&(!Number.isInteger(appId)||!appId))throw new StoreVerificationError("APPLE_NOT_CONFIGURED","APPLE_APP_ID obrigatório em produção.");
  return new SignedDataVerifier(roots,true,environment,bundleId,appId);
}

export async function verifyAndFulfillApple(input:{purchaserUserId:string;intentId:string;signedTransaction:string}){
  const {intent,storeProductId}=await loadIntent(input.intentId,input.purchaserUserId,"apple");
  let transaction;
  try{transaction=await appleVerifier().verifyAndDecodeTransaction(input.signedTransaction);}
  catch{throw new StoreVerificationError("APPLE_VERIFICATION_FAILED","A transação da App Store não pôde ser verificada.");}
  if(!transaction.transactionId||!transaction.productId)throw new StoreVerificationError("APPLE_TRANSACTION_INVALID","Transação Apple incompleta.");
  if(transaction.productId!==storeProductId)throw new StoreVerificationError("APPLE_PRODUCT_MISMATCH","Produto Apple não corresponde à intenção.");
  if(transaction.appAccountToken!==intent.id)throw new StoreVerificationError("APPLE_ACCOUNT_MISMATCH","Compra Apple não pertence a esta intenção.");
  if(transaction.revocationDate)throw new StoreVerificationError("APPLE_TRANSACTION_REVOKED","Transação Apple revogada.");
  const result=await fulfillVerifiedPurchase({
    provider:"apple",purchaserUserId:input.purchaserUserId,beneficiaryUserId:intent.beneficiaryUserId,
    purchaseIntentId:intent.id,storeProductId,externalTransactionId:transaction.transactionId,
    receiptHash:createHash("sha256").update(input.signedTransaction).digest("hex"),
    metadata:{environment:transaction.environment,originalTransactionId:transaction.originalTransactionId}
  });
  await db.update(purchaseIntents).set({status:"consumed",consumedAt:new Date()}).where(eq(purchaseIntents.id,intent.id));
  return result;
}

function googleAuth(){
  const raw=process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if(!raw)throw new StoreVerificationError("GOOGLE_PLAY_NOT_CONFIGURED","Validação Google Play não configurada.");
  let credentials:Record<string,unknown>;
  try{credentials=JSON.parse(raw) as Record<string,unknown>;}catch{throw new StoreVerificationError("GOOGLE_PLAY_NOT_CONFIGURED","Credencial Google Play inválida.");}
  return new GoogleAuth({credentials,scopes:["https://www.googleapis.com/auth/androidpublisher"]});
}
type ProductPurchaseV2={
  productLineItem?:Array<{productId?:string}>;
  purchaseStateContext?:{purchaseState?:string};
  orderId?:string;
  obfuscatedExternalAccountId?:string;
  acknowledgementState?:string;
  regionCode?:string;
};
type SubscriptionPurchaseV2={
  subscriptionState?:string;
  externalAccountIdentifiers?:{obfuscatedExternalAccountId?:string};
  acknowledgementState?:string;
  regionCode?:string;
  lineItems?:Array<{productId?:string;latestSuccessfulOrderId?:string;expiryTime?:string}>;
};

export async function verifyAndFulfillGoogle(input:{purchaserUserId:string;intentId:string;purchaseToken:string}){
  const {intent,storeProductId}=await loadIntent(input.intentId,input.purchaserUserId,"google");
  const packageName=process.env.GOOGLE_PLAY_PACKAGE_NAME;
  if(!packageName)throw new StoreVerificationError("GOOGLE_PLAY_NOT_CONFIGURED","GOOGLE_PLAY_PACKAGE_NAME ausente.");
  const auth=googleAuth();
  if(intent.productType==="diamonds"){
    const url=`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/purchases/productsv2/tokens/${encodeURIComponent(input.purchaseToken)}`;
    const response=await auth.request<ProductPurchaseV2>({url});
    const purchase=response.data;
    if(purchase.purchaseStateContext?.purchaseState!=="PURCHASED")throw new StoreVerificationError("GOOGLE_PURCHASE_NOT_COMPLETED","Compra Google Play ainda não concluída.");
    if(purchase.obfuscatedExternalAccountId!==intent.id)throw new StoreVerificationError("GOOGLE_ACCOUNT_MISMATCH","Compra Google Play não pertence a esta intenção.");
    if(!purchase.productLineItem?.some(v=>v.productId===storeProductId))throw new StoreVerificationError("GOOGLE_PRODUCT_MISMATCH","Produto Google Play não corresponde à intenção.");
    const externalId=purchase.orderId??createHash("sha256").update(input.purchaseToken).digest("hex");
    const result=await fulfillVerifiedPurchase({
      provider:"google",purchaserUserId:input.purchaserUserId,beneficiaryUserId:intent.beneficiaryUserId,
      purchaseIntentId:intent.id,storeProductId,externalTransactionId:externalId,receiptHash:createHash("sha256").update(input.purchaseToken).digest("hex"),
      metadata:{regionCode:purchase.regionCode}
    });
    await auth.request({url:`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/purchases/products/${encodeURIComponent(storeProductId)}/tokens/${encodeURIComponent(input.purchaseToken)}:consume`,method:"POST"});
    await db.update(purchaseIntents).set({status:"consumed",consumedAt:new Date()}).where(eq(purchaseIntents.id,intent.id));
    return result;
  }
  const url=`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(input.purchaseToken)}`;
  const response=await auth.request<SubscriptionPurchaseV2>({url});
  const purchase=response.data;
  if(!["SUBSCRIPTION_STATE_ACTIVE","SUBSCRIPTION_STATE_IN_GRACE_PERIOD"].includes(purchase.subscriptionState??""))throw new StoreVerificationError("GOOGLE_SUBSCRIPTION_INACTIVE","Assinatura Google Play não está ativa.");
  if(purchase.externalAccountIdentifiers?.obfuscatedExternalAccountId!==intent.id)throw new StoreVerificationError("GOOGLE_ACCOUNT_MISMATCH","Assinatura não pertence a esta intenção.");
  const line=purchase.lineItems?.find(v=>v.productId===storeProductId);
  if(!line)throw new StoreVerificationError("GOOGLE_PRODUCT_MISMATCH","Produto Google Play não corresponde à intenção.");
  const externalId=line.latestSuccessfulOrderId??createHash("sha256").update(input.purchaseToken).digest("hex");
  const result=await fulfillVerifiedPurchase({
    provider:"google",purchaserUserId:input.purchaserUserId,beneficiaryUserId:intent.beneficiaryUserId,
    purchaseIntentId:intent.id,storeProductId,externalTransactionId:externalId,receiptHash:createHash("sha256").update(input.purchaseToken).digest("hex"),
    metadata:{regionCode:purchase.regionCode,expiryTime:line.expiryTime}
  });
  if(purchase.acknowledgementState==="ACKNOWLEDGEMENT_STATE_PENDING"){
    await auth.request({url:`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/purchases/subscriptions/${encodeURIComponent(storeProductId)}/tokens/${encodeURIComponent(input.purchaseToken)}:acknowledge`,method:"POST"});
  }
  await db.update(purchaseIntents).set({status:"consumed",consumedAt:new Date()}).where(eq(purchaseIntents.id,intent.id));
  return result;
}
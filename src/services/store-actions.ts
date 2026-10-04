import { eq } from "drizzle-orm";
import { GoogleAuth } from "google-auth-library";
import { db } from "@/lib/db";
import { storeActionJobs } from "@/db/schema";
import { decryptStoreToken, encryptStoreToken } from "@/lib/secrets";

function googleAuth(){
  const raw=process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if(!raw)throw new Error("GOOGLE_PLAY_NOT_CONFIGURED");
  return new GoogleAuth({credentials:JSON.parse(raw),scopes:["https://www.googleapis.com/auth/androidpublisher"]});
}
export async function finalizeGooglePurchase(input:{
  action:"consume"|"acknowledge";
  externalTransactionId:string;
  purchaseToken:string;
  productId:string;
}):Promise<{completed:boolean;queued:boolean}>{
  const packageName=process.env.GOOGLE_PLAY_PACKAGE_NAME;
  if(!packageName)throw new Error("GOOGLE_PLAY_NOT_CONFIGURED");
  const url=input.action==="consume"
    ?`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/purchases/products/${encodeURIComponent(input.productId)}/tokens/${encodeURIComponent(input.purchaseToken)}:consume`
    :`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/purchases/subscriptions/${encodeURIComponent(input.productId)}/tokens/${encodeURIComponent(input.purchaseToken)}:acknowledge`;
  try{
    await googleAuth().request({url,method:"POST"});
    return {completed:true,queued:false};
  }catch(error){
    await db.insert(storeActionJobs).values({
      provider:"google",action:input.action,externalTransactionId:input.externalTransactionId,
      encryptedToken:encryptStoreToken(input.purchaseToken),productId:input.productId,
      lastError:error instanceof Error?error.message.slice(0,1000):"Google Play request failed"
    }).onConflictDoUpdate({
      target:[storeActionJobs.provider,storeActionJobs.action,storeActionJobs.externalTransactionId],
      set:{status:"queued",availableAt:new Date(Date.now()+60_000),updatedAt:new Date(),lastError:error instanceof Error?error.message.slice(0,1000):"Google Play request failed"}
    });
    return {completed:false,queued:true};
  }
}
export async function runStoreActionJob(id:string){
  const [job]=await db.select().from(storeActionJobs).where(eq(storeActionJobs.id,id)).limit(1);
  if(!job||job.provider!=="google")return {processed:false};
  const token=decryptStoreToken(job.encryptedToken);
  const packageName=process.env.GOOGLE_PLAY_PACKAGE_NAME;
  if(!packageName)throw new Error("GOOGLE_PLAY_NOT_CONFIGURED");
  const url=job.action==="consume"
    ?`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/purchases/products/${encodeURIComponent(job.productId)}/tokens/${encodeURIComponent(token)}:consume`
    :`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/purchases/subscriptions/${encodeURIComponent(job.productId)}/tokens/${encodeURIComponent(token)}:acknowledge`;
  try{
    await googleAuth().request({url,method:"POST"});
    await db.update(storeActionJobs).set({status:"done",lockedAt:null,lastError:null,updatedAt:new Date()}).where(eq(storeActionJobs.id,id));
    return {processed:true};
  }catch(error){
    const attempts=job.attempts+1;
    const delay=Math.min(3600_000,60_000*2**Math.min(attempts,6));
    await db.update(storeActionJobs).set({
      status:attempts>=10?"dead":"queued",attempts,lockedAt:null,availableAt:new Date(Date.now()+delay),
      lastError:error instanceof Error?error.message.slice(0,1000):"Google Play request failed",updatedAt:new Date()
    }).where(eq(storeActionJobs.id,id));
    return {processed:false};
  }
}
import { createPublicKey, verify as verifySignature } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import { pool } from "@/lib/db";
import {
  ensureLedgerAccount, ensureUserDiamondAccount, postLedgerTransaction
} from "@/services/ledger";

const KEY_URL="https://www.gstatic.com/admob/reward/verifier-keys.json";
let keyCache:{expiresAt:number;keys:Map<string,string>}|null=null;

export class AdRewardError extends Error{
  constructor(public readonly code:string,message:string){super(message);}
}

function secret(){
  const value=process.env.SESSION_SECRET;
  if(!value||value.length<32)throw new AdRewardError("REWARD_NOT_CONFIGURED","SESSION_SECRET inválido.");
  return new TextEncoder().encode(value);
}
function units():Record<string,number>{
  const raw=process.env.ADMOB_REWARDED_AD_UNITS_JSON;
  if(!raw)throw new AdRewardError("REWARD_NOT_CONFIGURED","AdMob rewarded não configurado.");
  try{
    const parsed=JSON.parse(raw) as Record<string,unknown>;
    const result:Record<string,number>={};
    for(const [id,value] of Object.entries(parsed)){
      if(typeof value==="number"&&Number.isInteger(value)&&value>0&&value<=10000)result[id]=value;
    }
    if(!Object.keys(result).length)throw new Error("empty");
    return result;
  }catch{throw new AdRewardError("REWARD_NOT_CONFIGURED","Configuração de rewards inválida.");}
}

export function getRewardedAdCatalog(){
  return Object.entries(units()).map(([adUnitId,rewardDiamonds])=>({adUnitId,rewardDiamonds}));
}

export async function createRewardIntent(userId:string,adUnitId:string){
  const reward=units()[adUnitId];
  if(!reward)throw new AdRewardError("AD_UNIT_NOT_ALLOWED","Bloco de anúncio indisponível.");
  const customData=await new SignJWT({scope:"ad_reward",userId,adUnitId})
    .setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("15m").sign(secret());
  return {userId,adUnitId,rewardDiamonds:reward,customData};
}

async function publicKeys(){
  if(keyCache&&keyCache.expiresAt>Date.now())return keyCache.keys;
  const response=await fetch(KEY_URL,{cache:"no-store",signal:AbortSignal.timeout(10_000)});
  if(!response.ok)throw new AdRewardError("ADMOB_KEYS_UNAVAILABLE","Chaves AdMob indisponíveis.");
  const body=await response.json() as {keys?:Array<{keyId?:number;pem?:string}>};
  const keys=new Map<string,string>();
  for(const item of body.keys??[]){
    if(typeof item.keyId==="number"&&typeof item.pem==="string")keys.set(String(item.keyId),item.pem);
  }
  if(!keys.size)throw new AdRewardError("ADMOB_KEYS_INVALID","Nenhuma chave AdMob válida.");
  keyCache={keys,expiresAt:Date.now()+6*60*60*1000};
  return keys;
}

export async function verifyAdmobCallback(rawUrl:string){
  const queryIndex=rawUrl.indexOf("?");
  if(queryIndex<0)throw new AdRewardError("ADMOB_QUERY_MISSING","Callback inválido.");
  const rawQuery=rawUrl.slice(queryIndex+1);
  const signatureMarker="&signature=";
  const signatureIndex=rawQuery.indexOf(signatureMarker);
  if(signatureIndex<0)throw new AdRewardError("ADMOB_SIGNATURE_MISSING","Assinatura ausente.");
  const signedContent=rawQuery.slice(0,signatureIndex);
  const signatureAndKey=rawQuery.slice(signatureIndex+signatureMarker.length);
  const keyMarker="&key_id=";
  const keyIndex=signatureAndKey.indexOf(keyMarker);
  if(keyIndex<0)throw new AdRewardError("ADMOB_KEY_ID_MISSING","key_id ausente.");

  const signatureRaw=decodeURIComponent(signatureAndKey.slice(0,keyIndex));
  const keyId=decodeURIComponent(signatureAndKey.slice(keyIndex+keyMarker.length));
  const pem=(await publicKeys()).get(keyId);
  if(!pem)throw new AdRewardError("ADMOB_KEY_UNKNOWN","Chave AdMob desconhecida.");

  const signature=Buffer.from(signatureRaw,"base64url");
  const valid=verifySignature("sha256",Buffer.from(signedContent,"utf8"),createPublicKey(pem),signature);
  if(!valid)throw new AdRewardError("ADMOB_SIGNATURE_INVALID","Assinatura AdMob inválida.");

  const params=new URLSearchParams(rawQuery);
  const userId=params.get("user_id");
  const customData=params.get("custom_data");
  const adUnitId=params.get("ad_unit");
  const transactionId=params.get("transaction_id");
  const timestamp=params.get("timestamp");
  if(!userId||!customData||!adUnitId||!transactionId||!timestamp){
    throw new AdRewardError("ADMOB_CALLBACK_INCOMPLETE","Callback AdMob incompleto.");
  }
  const timestampMs=Number(timestamp);
  if(!Number.isFinite(timestampMs)||Math.abs(Date.now()-timestampMs)>48*60*60*1000){
    throw new AdRewardError("ADMOB_TIMESTAMP_INVALID","Callback AdMob fora da janela permitida.");
  }

  let payload;
  try{({payload}=await jwtVerify(customData,secret()));}
  catch{throw new AdRewardError("ADMOB_CUSTOM_DATA_INVALID","Intenção de reward inválida.");}
  if(payload.scope!=="ad_reward"||payload.userId!==userId||payload.adUnitId!==adUnitId){
    throw new AdRewardError("ADMOB_INTENT_MISMATCH","Reward não corresponde à intenção.");
  }
  const rewardDiamonds=units()[adUnitId];
  if(!rewardDiamonds)throw new AdRewardError("AD_UNIT_NOT_ALLOWED","Bloco de anúncio não autorizado.");
  return {userId,adUnitId,transactionId,rewardDiamonds,timestampMs};
}

export async function fulfillAdReward(input:{userId:string;transactionId:string;rewardDiamonds:number}){
  const client=await pool.connect();
  try{
    await client.query("begin isolation level serializable");
    const duplicate=await client.query<{id:string}>(
      "select id from rewarded_ad_claims where provider='admob' and external_event_id=$1 for update",
      [input.transactionId]
    );
    if(duplicate.rowCount){await client.query("commit");return {duplicate:true,claimId:duplicate.rows[0].id};}

    const active=await client.query("select 1 from users where id=$1 and status='active'",[input.userId]);
    if(!active.rowCount)throw new AdRewardError("REWARD_USER_INVALID","Usuário não pode receber reward.");

    const userAccount=await ensureUserDiamondAccount(client,input.userId);
    const source=await ensureLedgerAccount(client,"system:diamonds:rewarded-ads","system",null);
    const ledger=await postLedgerTransaction(client,{
      type:"reward",referenceType:"rewarded_ad",idempotencyKey:"admob:"+input.transactionId,
      entries:[
        {accountId:source,direction:"debit",amount:input.rewardDiamonds},
        {accountId:userAccount,direction:"credit",amount:input.rewardDiamonds}
      ]
    });
    const claim=await client.query<{id:string}>(
      `insert into rewarded_ad_claims(id,user_id,provider,external_event_id,reward_diamonds,ledger_transaction_id)
       values(gen_random_uuid(),$1,'admob',$2,$3,$4) returning id`,
      [input.userId,input.transactionId,input.rewardDiamonds,ledger.transactionId]
    );
    await client.query("commit");
    return {duplicate:false,claimId:claim.rows[0].id,ledgerTransactionId:ledger.transactionId};
  }catch(error){
    await client.query("rollback");
    if(error instanceof AdRewardError)throw error;
    if((error as {code?:string}).code==="23505")return {duplicate:true};
    throw error;
  }finally{client.release();}
}
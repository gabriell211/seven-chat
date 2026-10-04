import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type RatePolicy="auth"|"write"|"financial"|"report";

let redis:Redis|null|undefined;
const limiters=new Map<RatePolicy,Ratelimit>();

function getRedis():Redis|null{
  if(redis!==undefined)return redis;
  const url=process.env.UPSTASH_REDIS_REST_URL,token=process.env.UPSTASH_REDIS_REST_TOKEN;
  redis=url&&token?new Redis({url,token,enableTelemetry:false}):null;
  return redis;
}
function limiter(policy:RatePolicy):Ratelimit|null{
  const cached=limiters.get(policy);if(cached)return cached;
  const client=getRedis();if(!client)return null;
  const rules={
    auth:Ratelimit.slidingWindow(10,"10 m"),
    write:Ratelimit.slidingWindow(60,"1 m"),
    financial:Ratelimit.slidingWindow(20,"1 m"),
    report:Ratelimit.slidingWindow(10,"10 m")
  } as const;
  const value=new Ratelimit({redis:client,limiter:rules[policy],prefix:"seven-chat:"+policy,analytics:true,enableTelemetry:false});
  limiters.set(policy,value);return value;
}
function ipKey(req:Request){
  const raw=(req.headers.get("x-forwarded-for")??req.headers.get("x-real-ip")??"unknown").split(",")[0].trim();
  return createHash("sha256").update(raw).digest("hex").slice(0,24);
}
export async function checkRateLimit(req:Request,policy:RatePolicy,subject?:string):Promise<{ok:true}|{ok:false;status:429|503;retryAfter?:number}>{
  const value=limiter(policy);
  if(!value){
    if(process.env.NODE_ENV==="production")return {ok:false,status:503};
    return {ok:true};
  }
  const result=await value.limit(subject??ipKey(req));
  if(result.success)return {ok:true};
  const retryAfter=Math.max(1,Math.ceil((result.reset-Date.now())/1000));
  return {ok:false,status:429,retryAfter};
}

export async function enforceRateLimit(req:Request,policy:RatePolicy,subject?:string){
  const result=await checkRateLimit(req,policy,subject);
  if(result.ok)return null;
  if(result.status===503)return NextResponse.json(
    {error:{code:"RATE_LIMIT_UNAVAILABLE",message:"Proteção contra abuso temporariamente indisponível."}},
    {status:503}
  );
  return NextResponse.json(
    {error:{code:"RATE_LIMITED",message:"Muitas tentativas. Tente novamente em instantes."}},
    {status:429,headers:{"retry-after":String(result.retryAfter??60)}}
  );
}

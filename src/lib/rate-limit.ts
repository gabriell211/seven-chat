import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { pool } from "@/lib/db";

export type RatePolicy="auth"|"write"|"financial"|"report";

const policies:Record<RatePolicy,{limit:number;windowMs:number}>={
  auth:{limit:10,windowMs:10*60*1000},
  write:{limit:60,windowMs:60*1000},
  financial:{limit:20,windowMs:60*1000},
  report:{limit:10,windowMs:10*60*1000}
};

let redis:Redis|null|undefined;
const limiters=new Map<RatePolicy,Ratelimit>();
let pgReady:Promise<void>|null=null;

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

async function ensurePgRateLimitTable(){
  pgReady??=pool.query(`
    create table if not exists seven_rate_limits (
      bucket_key text primary key,
      window_start timestamptz not null,
      request_count integer not null,
      expires_at timestamptz not null
    )
  `).then(()=>undefined);
  return pgReady;
}

async function postgresLimit(policy:RatePolicy,key:string):Promise<{ok:true}|{ok:false;status:429;retryAfter:number}>{
  await ensurePgRateLimitTable();
  const rule=policies[policy],now=Date.now();
  const windowStartMs=Math.floor(now/rule.windowMs)*rule.windowMs;
  const windowStart=new Date(windowStartMs);
  const expiresAt=new Date(windowStartMs+rule.windowMs);
  const bucketKey=policy+":"+key;
  const result=await pool.query<{request_count:number}>(`
    insert into seven_rate_limits(bucket_key,window_start,request_count,expires_at)
    values($1,$2,1,$3)
    on conflict(bucket_key) do update set
      request_count=case
        when seven_rate_limits.window_start < excluded.window_start then 1
        else seven_rate_limits.request_count+1
      end,
      window_start=case
        when seven_rate_limits.window_start < excluded.window_start then excluded.window_start
        else seven_rate_limits.window_start
      end,
      expires_at=case
        when seven_rate_limits.window_start < excluded.window_start then excluded.expires_at
        else seven_rate_limits.expires_at
      end
    returning request_count
  `,[bucketKey,windowStart,expiresAt]);
  const count=Number(result.rows[0]?.request_count??1);
  if(count<=rule.limit)return {ok:true};
  return {ok:false,status:429,retryAfter:Math.max(1,Math.ceil((expiresAt.getTime()-now)/1000))};
}

export async function checkRateLimit(req:Request,policy:RatePolicy,subject?:string):Promise<{ok:true}|{ok:false;status:429|503;retryAfter?:number}>{
  const key=subject??ipKey(req);
  const value=limiter(policy);
  if(value){
    try{
      const result=await value.limit(key);
      if(result.success)return {ok:true};
      return {ok:false,status:429,retryAfter:Math.max(1,Math.ceil((result.reset-Date.now())/1000))};
    }catch{
      // Redis indisponível: mantém proteção usando o PostgreSQL.
    }
  }
  try{
    return await postgresLimit(policy,key);
  }catch(error){
    if(process.env.NODE_ENV!=="production")console.error("rate limit fallback failed",error);
    return process.env.NODE_ENV==="production"?{ok:false,status:503}:{ok:true};
  }
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

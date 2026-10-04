import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { userSessions } from "@/db/schema";

const COOKIE_NAME = "seven_session";
const OAUTH_PENDING_COOKIE = "seven_oauth_pending";

function getSecret():Uint8Array{
  const value=process.env.SESSION_SECRET;
  if(!value){
    if(process.env.NODE_ENV==="production")throw new Error("SESSION_SECRET_MISSING");
    return new TextEncoder().encode("development-only-change-me-at-least-32");
  }
  if(value.length<32)throw new Error("SESSION_SECRET_TOO_SHORT");
  return new TextEncoder().encode(value);
}

export type Session = { userId:string; username:string; sessionId?:string };
export type OAuthPending = { provider:"google"; subject:string; email:string; name:string };

export function hashPassword(password:string):string{
  const salt=randomBytes(16).toString("hex");
  return salt+":"+scryptSync(password,salt,64).toString("hex");
}
export function verifyPassword(password:string,stored:string):boolean{
  const [salt,storedHash]=stored.split(":");
  if(!salt||!storedHash)return false;
  const hash=scryptSync(password,salt,64);
  const expected=Buffer.from(storedHash,"hex");
  return hash.length===expected.length&&timingSafeEqual(hash,expected);
}

async function signSession(payload:Session,ttl:string="30d"):Promise<string>{
  return new SignJWT(payload).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime(ttl).sign(getSecret());
}

export async function createSession(session:Omit<Session,"sessionId">):Promise<void>{
  const token=await signSession(session);
  (await cookies()).set(COOKIE_NAME,token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:2592000});
}

export async function createDeviceSession(input:{
  userId:string;username:string;deviceName:string;platform:string;userAgent?:string|null;
}):Promise<{accessToken:string;sessionId:string;expiresAt:Date}>{
  const sessionId=randomUUID();
  const expiresAt=new Date(Date.now()+30*24*60*60*1000);
  await db.insert(userSessions).values({
    id:sessionId,userId:input.userId,deviceName:input.deviceName,platform:input.platform,
    userAgent:input.userAgent??null,expiresAt
  });
  return {accessToken:await signSession({userId:input.userId,username:input.username,sessionId}),sessionId,expiresAt};
}

export async function clearSession():Promise<void>{(await cookies()).delete(COOKIE_NAME);}

async function decodeSession(token:string):Promise<Session|null>{
  try{
    const {payload}=await jwtVerify(token,getSecret());
    if(typeof payload.userId!=="string"||typeof payload.username!=="string")return null;
    return {
      userId:payload.userId,username:payload.username,
      sessionId:typeof payload.sessionId==="string"?payload.sessionId:undefined
    };
  }catch{return null;}
}

async function validateDeviceSession(session:Session):Promise<Session|null>{
  if(!session.sessionId)return session;
  const [active]=await db.select({id:userSessions.id}).from(userSessions).where(and(
    eq(userSessions.id,session.sessionId),eq(userSessions.userId,session.userId),
    isNull(userSessions.revokedAt),gt(userSessions.expiresAt,new Date())
  )).limit(1);
  if(!active)return null;
  await db.update(userSessions).set({lastSeenAt:new Date()}).where(eq(userSessions.id,session.sessionId));
  return session;
}

export async function getSession():Promise<Session|null>{
  const token=(await cookies()).get(COOKIE_NAME)?.value;
  if(!token)return null;
  const decoded=await decodeSession(token);
  return decoded?validateDeviceSession(decoded):null;
}

export async function getRequestSession(req:Request):Promise<Session|null>{
  const auth=req.headers.get("authorization");
  if(auth?.startsWith("Bearer ")){
    const decoded=await decodeSession(auth.slice(7));
    return decoded?validateDeviceSession(decoded):null;
  }
  return getSession();
}

export async function requireSession():Promise<Session>{
  const session=await getSession();
  if(!session)throw new Error("UNAUTHORIZED");
  return session;
}
export async function requireRequestSession(req:Request):Promise<Session>{
  const session=await getRequestSession(req);
  if(!session)throw new Error("UNAUTHORIZED");
  return session;
}

export async function revokeDeviceSession(userId:string,sessionId:string):Promise<boolean>{
  const rows=await db.update(userSessions).set({revokedAt:new Date()})
    .where(and(eq(userSessions.id,sessionId),eq(userSessions.userId,userId))).returning({id:userSessions.id});
  return rows.length>0;
}
export async function revokeAllDeviceSessions(userId:string):Promise<void>{
  await db.update(userSessions).set({revokedAt:new Date()})
    .where(and(eq(userSessions.userId,userId),isNull(userSessions.revokedAt)));
}

export async function createOAuthPending(data:OAuthPending):Promise<void>{
  const token=await new SignJWT(data).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("10m").sign(getSecret());
  (await cookies()).set(OAUTH_PENDING_COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:600});
}
export async function getOAuthPending():Promise<OAuthPending|null>{
  const token=(await cookies()).get(OAUTH_PENDING_COOKIE)?.value;
  if(!token)return null;
  try{
    const {payload}=await jwtVerify(token,getSecret());
    if(payload.provider!=="google"||typeof payload.subject!=="string"||typeof payload.email!=="string"||typeof payload.name!=="string")return null;
    return {provider:"google",subject:payload.subject,email:payload.email,name:payload.name};
  }catch{return null;}
}
export async function clearOAuthPending():Promise<void>{(await cookies()).delete(OAUTH_PENDING_COOKIE);}

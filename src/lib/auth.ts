import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "seven_session";
const secret = new TextEncoder().encode(process.env.SESSION_SECRET ?? "development-only-change-me");
export type Session = { userId: string; username: string };

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return salt + ":" + hash;
}
export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(":");
  if (parts.length !== 2) return false;
  const hash = scryptSync(password, parts[0], 64);
  const expected = Buffer.from(parts[1], "hex");
  return hash.length === expected.length && timingSafeEqual(hash, expected);
}
export async function createSession(session: Session): Promise<void> {
  const token = await new SignJWT(session).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("30d").sign(secret);
  (await cookies()).set(COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 2592000 });
}
export async function clearSession(): Promise<void> { (await cookies()).delete(COOKIE_NAME); }
export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    if (typeof payload.userId !== "string" || typeof payload.username !== "string") return null;
    return { userId: payload.userId, username: payload.username };
  } catch { return null; }
}
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}

const OAUTH_PENDING_COOKIE = "seven_oauth_pending";
export type OAuthPending = { provider:"google"; subject:string; email:string; name:string };

export async function createOAuthPending(data:OAuthPending):Promise<void>{
  const token=await new SignJWT(data).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("10m").sign(secret);
  (await cookies()).set(OAUTH_PENDING_COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:600});
}
export async function getOAuthPending():Promise<OAuthPending|null>{
  const token=(await cookies()).get(OAUTH_PENDING_COOKIE)?.value;
  if(!token)return null;
  try{
    const {payload}=await jwtVerify(token,secret);
    if(payload.provider!=="google"||typeof payload.subject!=="string"||typeof payload.email!=="string"||typeof payload.name!=="string")return null;
    return {provider:"google",subject:payload.subject,email:payload.email,name:payload.name};
  }catch{return null;}
}
export async function clearOAuthPending():Promise<void>{(await cookies()).delete(OAUTH_PENDING_COOKIE);}

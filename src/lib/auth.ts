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
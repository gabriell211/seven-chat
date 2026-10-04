import { NextResponse } from "next/server";
import { eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { createSession, verifyPassword } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rate-limit";
export async function POST(req:Request){
  const rate=await checkRateLimit(req,"auth"); if(!rate.ok)return NextResponse.redirect(new URL("/login?error=rate_limited",req.url),303);
  const parsed=loginSchema.safeParse(Object.fromEntries(await req.formData()));
  if(!parsed.success)return NextResponse.redirect(new URL("/login?error=validation",req.url),303);
  const identifier=parsed.data.identifier.trim().toLowerCase().replace(/^@/,"");
  const [user]=await db.select().from(users).where(or(eq(users.email,identifier),eq(users.username,identifier))).limit(1);
  if(!user?.passwordHash||!verifyPassword(parsed.data.password,user.passwordHash)){
    return NextResponse.redirect(new URL("/login?error=credentials",req.url),303);
  }
  if(user.status==="pending_verification")return NextResponse.redirect(new URL("/verify-email?pending=1&email="+encodeURIComponent(user.email),req.url),303);
  if(user.status!=="active")return NextResponse.redirect(new URL("/login?error=account_unavailable",req.url),303);
  await createSession({userId:user.id,username:user.username});
  return NextResponse.redirect(new URL("/",req.url),303);
}
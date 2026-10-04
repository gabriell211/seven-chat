import { NextResponse } from "next/server";
import { eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { requestPasswordReset } from "@/services/auth-challenges";
import { checkRateLimit } from "@/lib/rate-limit";
export async function POST(req:Request){
  const rate=await checkRateLimit(req,"auth"); if(!rate.ok)return NextResponse.redirect(new URL("/login?error=rate_limited",req.url),303);
  const form=await req.formData(),ident=String(form.get("identifier")??"").trim().toLowerCase().replace(/^@/,"");
  const [user]=await db.select({id:users.id,email:users.email,username:users.username}).from(users)
    .where(or(eq(users.email,ident),eq(users.username,ident))).limit(1);
  if(user){try{await requestPasswordReset(user);}catch{}}
  return NextResponse.redirect(new URL("/forgot-password?sent=1",req.url),303);
}
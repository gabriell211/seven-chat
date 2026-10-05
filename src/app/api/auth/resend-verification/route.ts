import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { issueEmailVerification } from "@/services/auth-challenges";
import { checkRateLimit } from "@/lib/rate-limit";
export async function POST(req:Request){
  const rate=await checkRateLimit(req,"auth"); if(!rate.ok)return NextResponse.redirect(new URL("/login?error=rate_limited",req.url),303);
  const form=await req.formData(),email=String(form.get("email")??"").trim().toLowerCase();
  const [user]=await db.select({id:users.id,email:users.email,username:users.username}).from(users)
    .where(and(eq(users.email,email),eq(users.status,"pending_verification"))).limit(1);
  if(user){
    try{
      await issueEmailVerification(user);
    }catch(error){
      console.error("verification email resend failed",error);
      return NextResponse.redirect(
        new URL("/verify-email?pending=1&delivery=failed&email="+encodeURIComponent(email),req.url),
        303
      );
    }
  }
  return NextResponse.redirect(new URL("/verify-email?pending=1&delivery=sent&email="+encodeURIComponent(email),req.url),303);
}
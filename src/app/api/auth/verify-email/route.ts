import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { consumeChallenge } from "@/services/auth-challenges";
export async function POST(req:Request){
  const form=await req.formData(),token=String(form.get("token")??"");
  const challenge=await consumeChallenge(token,"verify_email");
  if(!challenge)return NextResponse.redirect(new URL("/verify-email?error=1",req.url),303);
  await db.update(users).set({emailVerifiedAt:new Date(),status:"active",updatedAt:new Date()}).where(eq(users.id,challenge.userId));
  return NextResponse.redirect(new URL("/verify-email?success=1",req.url),303);
}
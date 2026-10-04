import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { userSessions, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { consumeChallenge } from "@/services/auth-challenges";
export async function POST(req:Request){
  const form=await req.formData(),token=String(form.get("token")??""),password=String(form.get("password")??"");
  if(password.length<10||password.length>128)return NextResponse.redirect(new URL("/reset-password?error=1&token="+encodeURIComponent(token),req.url),303);
  const challenge=await consumeChallenge(token,"reset_password");
  if(!challenge)return NextResponse.redirect(new URL("/reset-password?error=1",req.url),303);
  await db.transaction(async tx=>{
    await tx.update(users).set({passwordHash:hashPassword(password),emailVerifiedAt:new Date(),status:"active",updatedAt:new Date()}).where(eq(users.id,challenge.userId));
    await tx.update(userSessions).set({revokedAt:new Date()}).where(eq(userSessions.userId,challenge.userId));
  });
  return NextResponse.redirect(new URL("/reset-password?success=1",req.url),303);
}
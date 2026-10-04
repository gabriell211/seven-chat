import { NextResponse } from "next/server";
import { eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles, users } from "@/db/schema";
import { createSession, hashPassword } from "@/lib/auth";
import { registerSchema } from "@/lib/validation";
export async function POST(req:Request){
  const parsed=registerSchema.safeParse(Object.fromEntries(await req.formData()));
  if(!parsed.success)return NextResponse.redirect(new URL("/register?error=validation",req.url),303);
  const v=parsed.data;
  const exists=await db.select({id:users.id}).from(users).where(or(eq(users.email,v.email),eq(users.username,v.username))).limit(1);
  if(exists.length)return NextResponse.redirect(new URL("/register?error=exists",req.url),303);
  const [user]=await db.insert(users).values({
    email:v.email,username:v.username,passwordHash:hashPassword(v.password),
    birthDate:v.birthDate,status:"active"
  }).returning({id:users.id,username:users.username});
  await db.insert(profiles).values({userId:user.id,displayName:v.displayName});
  await createSession({userId:user.id,username:user.username});
  return NextResponse.redirect(new URL("/",req.url),303);
}
import { NextResponse } from "next/server";
import { eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { oauthAccounts, profiles, users } from "@/db/schema";
import { clearOAuthPending, createSession, getOAuthPending, hashPassword } from "@/lib/auth";
import { oauthRegisterSchema, registerSchema } from "@/lib/validation";
import { issueEmailVerification } from "@/services/auth-challenges";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req:Request){
  const rate=await checkRateLimit(req,"auth"); if(!rate.ok)return NextResponse.redirect(new URL("/register?error=rate_limited",req.url),303);
  const form=Object.fromEntries(await req.formData());
  const oauth=await getOAuthPending();

  if(oauth){
    const parsed=oauthRegisterSchema.safeParse(form);
    if(!parsed.success)return NextResponse.redirect(new URL("/register?oauth=google&error=validation",req.url),303);
    const exists=await db.select({id:users.id}).from(users)
      .where(or(eq(users.email,oauth.email),eq(users.username,parsed.data.username))).limit(1);
    if(exists.length)return NextResponse.redirect(new URL("/register?oauth=google&error=exists",req.url),303);
    const [user]=await db.insert(users).values({
      email:oauth.email,username:parsed.data.username,passwordHash:null,
      birthDate:parsed.data.birthDate,status:"active",emailVerifiedAt:new Date()
    }).returning({id:users.id,username:users.username});
    await db.transaction(async(tx)=>{
      await tx.insert(profiles).values({userId:user.id,displayName:parsed.data.displayName});
      await tx.insert(oauthAccounts).values({provider:"google",providerAccountId:oauth.subject,userId:user.id});
    });
    await clearOAuthPending();
    await createSession({userId:user.id,username:user.username});
    return NextResponse.redirect(new URL("/",req.url),303);
  }

  const parsed=registerSchema.safeParse(form);
  if(!parsed.success)return NextResponse.redirect(new URL("/register?error=validation",req.url),303);
  const v=parsed.data;
  const exists=await db.select({id:users.id}).from(users).where(or(eq(users.email,v.email),eq(users.username,v.username))).limit(1);
  if(exists.length)return NextResponse.redirect(new URL("/register?error=exists",req.url),303);
  const [user]=await db.insert(users).values({
    email:v.email,username:v.username,passwordHash:hashPassword(v.password),birthDate:v.birthDate,status:"pending_verification"
  }).returning({id:users.id,username:users.username});
  await db.insert(profiles).values({userId:user.id,displayName:v.displayName});
  try{await issueEmailVerification({id:user.id,email:v.email,username:user.username});}
  catch{
    return NextResponse.redirect(new URL("/verify-email?pending=1&email="+encodeURIComponent(v.email),req.url),303);
  }
  return NextResponse.redirect(new URL("/verify-email?pending=1&email="+encodeURIComponent(v.email),req.url),303);
}
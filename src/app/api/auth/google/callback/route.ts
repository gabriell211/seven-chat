import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { oauthAccounts, users } from "@/db/schema";
import { createOAuthPending, createSession } from "@/lib/auth";

const googleKeys=createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export async function GET(req:Request){
  const url=new URL(req.url);
  const code=url.searchParams.get("code");
  const state=url.searchParams.get("state");
  const store=await cookies();
  const expectedState=store.get("seven_oauth_state")?.value;
  store.delete("seven_oauth_state");
  if(!code||!state||!expectedState||state!==expectedState)return NextResponse.redirect(new URL("/login?error=oauth_state",req.url));
  const clientId=process.env.GOOGLE_CLIENT_ID;
  const clientSecret=process.env.GOOGLE_CLIENT_SECRET;
  const base=process.env.NEXT_PUBLIC_APP_URL?.trim()||url.origin;
  if(!clientId||!clientSecret)return NextResponse.redirect(new URL("/login?error=google_not_configured",req.url));
  try{
    const tokenResponse=await fetch("https://oauth2.googleapis.com/token",{
      method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},
      body:new URLSearchParams({code,client_id:clientId,client_secret:clientSecret,redirect_uri:base+"/api/auth/google/callback",grant_type:"authorization_code"}),
      cache:"no-store"
    });
    if(!tokenResponse.ok)throw new Error("TOKEN_EXCHANGE_FAILED");
    const tokenData=await tokenResponse.json() as {id_token?:string};
    if(!tokenData.id_token)throw new Error("MISSING_ID_TOKEN");
    const {payload}=await jwtVerify(tokenData.id_token,googleKeys,{audience:clientId,issuer:["https://accounts.google.com","accounts.google.com"]});
    if(typeof payload.sub!=="string"||typeof payload.email!=="string"||payload.email_verified!==true)throw new Error("INVALID_GOOGLE_IDENTITY");
    const email=payload.email.toLowerCase();
    const name=typeof payload.name==="string"?payload.name:"Seven User";
    const [linked]=await db.select({userId:oauthAccounts.userId,username:users.username})
      .from(oauthAccounts).innerJoin(users,eq(oauthAccounts.userId,users.id))
      .where(and(eq(oauthAccounts.provider,"google"),eq(oauthAccounts.providerAccountId,payload.sub))).limit(1);
    if(linked){
      await createSession({userId:linked.userId,username:linked.username});
      return NextResponse.redirect(new URL("/",req.url));
    }
    const [existing]=await db.select({id:users.id,username:users.username}).from(users).where(eq(users.email,email)).limit(1);
    if(existing){
      await db.insert(oauthAccounts).values({provider:"google",providerAccountId:payload.sub,userId:existing.id}).onConflictDoNothing();
      await createSession({userId:existing.id,username:existing.username});
      return NextResponse.redirect(new URL("/",req.url));
    }
    await createOAuthPending({provider:"google",subject:payload.sub,email,name});
    return NextResponse.redirect(new URL("/register?oauth=google",req.url));
  }catch{
    return NextResponse.redirect(new URL("/login?error=google_failed",req.url));
  }
}
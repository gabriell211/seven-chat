import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
export async function GET(req:Request){
  const clientId=process.env.GOOGLE_CLIENT_ID;
  if(!clientId)return NextResponse.redirect(new URL("/login?error=google_not_configured",req.url));
  const base=process.env.NEXT_PUBLIC_APP_URL??new URL(req.url).origin;
  const state=randomBytes(24).toString("hex");
  (await cookies()).set("seven_oauth_state",state,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:600});
  const p=new URLSearchParams({
    client_id:clientId,redirect_uri:base+"/api/auth/google/callback",response_type:"code",
    scope:"openid email profile",access_type:"offline",prompt:"select_account",state
  });
  return NextResponse.redirect("https://accounts.google.com/o/oauth2/v2/auth?"+p.toString());
}
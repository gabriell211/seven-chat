import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

export async function GET(req:Request){
  const url=new URL(req.url);
  const intent=url.searchParams.get("intent")==="register"?"register":"login";
  const fallback=intent==="register"?"/register?error=google_not_configured":"/login?error=google_not_configured";

  const clientId=process.env.GOOGLE_CLIENT_ID;
  if(!clientId)return NextResponse.redirect(new URL(fallback,req.url));

  const base=process.env.NEXT_PUBLIC_APP_URL?.trim()||url.origin;
  const state=randomBytes(24).toString("hex");
  const store=await cookies();
  store.set("seven_oauth_state",state,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:600});
  store.set("seven_oauth_intent",intent,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:600});

  const p=new URLSearchParams({
    client_id:clientId,
    redirect_uri:base+"/api/auth/google/callback",
    response_type:"code",
    scope:"openid email profile",
    access_type:"offline",
    prompt:"select_account",
    state
  });

  return NextResponse.redirect("https://accounts.google.com/o/oauth2/v2/auth?"+p.toString());
}

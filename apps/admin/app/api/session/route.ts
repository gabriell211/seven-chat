import {NextResponse} from "next/server";import {cookies} from "next/headers";
const API=process.env.SEVEN_API_URL??"https://seven-chat-gwt1.vercel.app";
export async function POST(req:Request){
  const form=await req.formData();
  const response=await fetch(API+"/api/v1/auth/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
    identifier:String(form.get("identifier")??""),password:String(form.get("password")??""),
    deviceName:"Seven Chat Admin",platform:"web"
  })});
  if(!response.ok)return NextResponse.redirect(new URL("/login?error=1",req.url),303);
  const body=await response.json() as {data:{accessToken:string}};
  (await cookies()).set("seven_admin_token",body.data.accessToken,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:2592000});
  const check=await fetch(API+"/api/v1/admin/stats",{headers:{authorization:"Bearer "+body.data.accessToken}});
  if(!check.ok){(await cookies()).delete("seven_admin_token");return NextResponse.redirect(new URL("/login?error=forbidden",req.url),303);}
  return NextResponse.redirect(new URL("/",req.url),303);
}
import {cookies} from "next/headers";
const API=process.env.SEVEN_API_URL??"https://seven-chat-gwt1.vercel.app";
export async function adminApi<T>(path:string,init:RequestInit={}):Promise<T>{
  const token=(await cookies()).get("seven_admin_token")?.value;
  if(!token)throw new Error("UNAUTHORIZED");
  const headers=new Headers(init.headers);headers.set("authorization","Bearer "+token);headers.set("accept","application/json");
  if(init.body)headers.set("content-type","application/json");
  const res=await fetch(API+path,{...init,headers,cache:"no-store"});
  if(!res.ok)throw new Error(res.status===401?"UNAUTHORIZED":"FORBIDDEN");
  return res.json() as Promise<T>;
}
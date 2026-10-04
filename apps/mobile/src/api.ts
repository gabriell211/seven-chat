import { getToken } from "./auth";
const API_URL=process.env.EXPO_PUBLIC_SEVEN_API_URL??"https://seven-chat-gwt1.vercel.app";
export type ApiError={error:{code:string;message:string}};
export async function api<T>(path:string,init:RequestInit={}):Promise<T>{
  const token=await getToken();
  const headers=new Headers(init.headers);
  headers.set("accept","application/json");
  if(init.body)headers.set("content-type","application/json");
  if(token)headers.set("authorization","Bearer "+token);
  const response=await fetch(API_URL+path,{...init,headers});
  const body=await response.json() as T|ApiError;
  if(!response.ok)throw new Error("error" in (body as object)?(body as ApiError).error.message:"Falha na API");
  return body as T;
}
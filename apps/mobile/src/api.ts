import { getToken } from "./auth";
import { decodeApiBody, getApiErrorMessage } from "./api-response";

const API_URL=process.env.EXPO_PUBLIC_SEVEN_API_URL??"https://seven-chat-gwt1.vercel.app";

export async function api<T>(path:string,init:RequestInit={}):Promise<T>{
  const token=await getToken();
  const headers=new Headers(init.headers);
  headers.set("accept","application/json");
  if(init.body)headers.set("content-type","application/json");
  if(token)headers.set("authorization","Bearer "+token);

  const response=await fetch(API_URL+path,{...init,headers});
  const raw=await response.text();

  let body:T|undefined;
  try{
    body=decodeApiBody<T>(raw) as T|undefined;
  }catch{
    throw new Error(response.ok
      ?"O servidor retornou uma resposta inválida."
      :`Falha no servidor (${response.status}).`);
  }

  if(!response.ok)throw new Error(getApiErrorMessage(response.status,body));
  return body as T;
}

import { randomUUID } from "node:crypto";
import { pool } from "@/lib/db";

export async function publishRealtime(input:{channel:string;event:string;data:Record<string,unknown>}){
  const payload=JSON.stringify({id:randomUUID(),channel:input.channel,event:input.event,data:input.data,createdAt:new Date().toISOString()});
  if(Buffer.byteLength(payload)>7500)throw new Error("REALTIME_EVENT_TOO_LARGE");
  await pool.query("select pg_notify('seven_events',$1)",[payload]);
}

export async function publishRealtimeBestEffort(input:{channel:string;event:string;data:Record<string,unknown>}){
  try{
    await publishRealtime(input);
    return true;
  }catch(error){
    if(process.env.NODE_ENV!=="production")console.error("realtime publish failed",error);
    return false;
  }
}

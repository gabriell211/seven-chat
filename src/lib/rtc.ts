import { AccessToken } from "livekit-server-sdk";

export type RtcGrant={room:string;identity:string;canPublish:boolean;canSubscribe:boolean};

export async function createRtcToken(grant:RtcGrant):Promise<{token:string;url:string}>{
  const apiKey=process.env.LIVEKIT_API_KEY;
  const apiSecret=process.env.LIVEKIT_API_SECRET;
  const url=process.env.LIVEKIT_URL;
  if(!apiKey||!apiSecret||!url)throw new Error("RTC_NOT_CONFIGURED");
  const token=new AccessToken(apiKey,apiSecret,{identity:grant.identity,ttl:"10m"});
  token.addGrant({roomJoin:true,room:grant.room,canPublish:grant.canPublish,canSubscribe:grant.canSubscribe});
  return {token:await token.toJwt(),url};
}
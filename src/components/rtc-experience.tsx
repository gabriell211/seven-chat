"use client";

import { useState } from "react";
import {
  ControlBar, LiveKitRoom, RoomAudioRenderer, VideoConference
} from "@livekit/components-react";

type ResourceType="room"|"live"|"call";

async function request<T>(url:string,init:RequestInit={}):Promise<T>{
  const response=await fetch(url,{...init,headers:{"content-type":"application/json",...(init.headers??{})}});
  const body=await response.json();
  if(!response.ok)throw new Error(body?.error?.message??"Falha na conexão.");
  return body as T;
}

export function RtcExperience({
  resourceType,resourceId,mode,canPublishLocal=false,password
}:{
  resourceType:ResourceType;resourceId:string;mode:"audio"|"video";canPublishLocal?:boolean;password?:string;
}){
  const [connection,setConnection]=useState<{token:string;url:string}|null>(null);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);

  const connect=async()=>{
    try{
      setLoading(true);setError("");
      if(resourceType==="room"){
        await request("/api/v1/rooms/"+resourceId+"/join",{method:"POST",body:JSON.stringify({password:password||undefined})});
      }
      const result=await request<{data:{token:string;url:string}}>("/api/rtc/token",{
        method:"POST",body:JSON.stringify({resourceType,resourceId})
      });
      setConnection(result.data);
    }catch(e){setError(e instanceof Error?e.message:"Não foi possível conectar.");}
    finally{setLoading(false);}
  };

  if(!connection)return <div className="stack">
    {error&&<div className="error" role="alert">{error}</div>}
    <button className="button" onClick={()=>void connect()} disabled={loading}>
      {loading?"Conectando…":mode==="audio"?"Entrar na sala":"Assistir / entrar"}
    </button>
  </div>;

  return <div className="rtc-shell" data-lk-theme="default">
    <LiveKitRoom
      token={connection.token}
      serverUrl={connection.url}
      connect
      audio={canPublishLocal}
      video={mode==="video"&&canPublishLocal}
      onDisconnected={()=>setConnection(null)}
    >
      {mode==="video"?<VideoConference/>:<>
        <RoomAudioRenderer/>
        <div className="rtc-audio-state">
          <strong>Conectado à sala</strong>
          <span className="muted">{canPublishLocal?"Seu microfone pode ser ativado nos controles.":"Você está como ouvinte."}</span>
        </div>
        <ControlBar
          variation="minimal"
          controls={{camera:false,screenShare:false,chat:false,microphone:canPublishLocal}}
        />
      </>}
    </LiveKitRoom>
  </div>;
}
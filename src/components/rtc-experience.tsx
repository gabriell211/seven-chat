"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ControlBar,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks
} from "@livekit/components-react";
import { Track } from "livekit-client";

type ResourceType="room"|"live"|"call";

async function request<T>(url:string,init:RequestInit={}):Promise<T>{
  const response=await fetch(url,{...init,headers:{"content-type":"application/json",...(init.headers??{})}});
  const body=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(body?.error?.message??"Falha na conexão.");
  return body as T;
}

function LiveVideoStage({canPublishLocal}:{canPublishLocal:boolean}){
  const tracks=useTracks([{source:Track.Source.Camera,withPlaceholder:true}]);
  const visible=tracks.slice(0,5);
  const count=Math.max(1,visible.length);

  return <div className={"seven-rtc-live-grid seven-rtc-live-grid-"+count}>
    {visible.length?visible.map((trackRef,index)=><div className={"seven-rtc-tile seven-rtc-tile-"+index} key={trackRef.participant.identity+"-"+trackRef.source}>
      <ParticipantTile trackRef={trackRef} disableSpeakingIndicator={false}/>
      <div className="seven-rtc-name">{trackRef.participant.name||trackRef.participant.identity}</div>
    </div>):<div className="seven-rtc-waiting">
      <span className="live-chip">CONECTANDO</span>
      <strong>Preparando vídeo…</strong>
    </div>}

    {canPublishLocal&&<div className="seven-rtc-publisher-controls">
      <ControlBar
        variation="minimal"
        controls={{camera:true,microphone:true,screenShare:false,chat:false}}
      />
    </div>}
    <RoomAudioRenderer/>
  </div>;
}

export function RtcExperience({
  resourceType,resourceId,mode,canPublishLocal=false,password
}:{
  resourceType:ResourceType;resourceId:string;mode:"audio"|"video";canPublishLocal?:boolean;password?:string;
}){
  const [connection,setConnection]=useState<{token:string;url:string}|null>(null);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);

  const connect=useCallback(async()=>{
    if(loading||connection)return;
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
  },[connection,loading,password,resourceId,resourceType]);

  useEffect(()=>{
    if(resourceType==="live"&&!connection&&!loading)void connect();
  },[connect,connection,loading,resourceType]);

  if(!connection)return <div className={resourceType==="live"?"rtc-live-connect":"stack"}>
    {error&&<div className="error" role="alert">{error}</div>}
    <button className="button" onClick={()=>void connect()} disabled={loading}>
      {loading?"Conectando…":mode==="audio"?"Entrar na sala":"Entrar na LIVE"}
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
      onError={(err)=>setError(err.message)}
    >
      {mode==="video"?<LiveVideoStage canPublishLocal={canPublishLocal}/>:<>
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
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LiveExperience } from "@/components/live-experience";

type Live={
  id:string;title:string;category:string|null;viewerCount:number;peakViewers:number;
  thumbnailUrl:string|null;hostId:string;hostUsername:string;hostDisplayName:string;
  isHost:boolean;canPublish:boolean;initialFollowing:boolean;
  battle:{id:string;status:string;liveAId:string;liveBId:string;scoreA:number;scoreB:number;durationSeconds:number;startsAt:string|null;endsAt:string|null}|null;
};
type Gift={id:string;name:string;priceDiamonds:number;category:string;animationType:string;assetUrl:string|null};

function LiveSetupPreview(){
  const videoRef=useRef<HTMLVideoElement|null>(null);
  const streamRef=useRef<MediaStream|null>(null);
  const [cameraOn,setCameraOn]=useState(true);
  const [micOn,setMicOn]=useState(true);
  const [error,setError]=useState("");

  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      try{
        const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user"},audio:true});
        if(cancelled){stream.getTracks().forEach(t=>t.stop());return;}
        streamRef.current=stream;
        if(videoRef.current){videoRef.current.srcObject=stream;await videoRef.current.play().catch(()=>{});}
      }catch(e){
        setError(e instanceof Error?e.message:"Não foi possível acessar câmera e microfone.");
      }
    })();
    return ()=>{
      cancelled=true;
      streamRef.current?.getTracks().forEach(t=>t.stop());
      streamRef.current=null;
    };
  },[]);

  function toggleCamera(){
    const next=!cameraOn;setCameraOn(next);
    streamRef.current?.getVideoTracks().forEach(t=>{t.enabled=next;});
  }
  function toggleMic(){
    const next=!micOn;setMicOn(next);
    streamRef.current?.getAudioTracks().forEach(t=>{t.enabled=next;});
  }

  return <div className="live-preflight">
    <div className={"live-preflight-video "+(!cameraOn?"camera-off":"")}>
      <video ref={videoRef} muted playsInline/>
      {!cameraOn&&<div className="live-preflight-off"><span>◉</span><strong>Câmera desligada</strong></div>}
      <span className="live-chip">PRÉVIA</span>
      {error&&<div className="live-preflight-error">{error}</div>}
    </div>
    <div className="live-preflight-controls">
      <button type="button" className={cameraOn?"active":""} onClick={toggleCamera}><span>◉</span>{cameraOn?"Câmera ligada":"Câmera desligada"}</button>
      <button type="button" className={micOn?"active":""} onClick={toggleMic}><span>⌁</span>{micOn?"Microfone ligado":"Microfone desligado"}</button>
    </div>
  </div>;
}

export function LivesBrowser({lives,gifts,loggedIn,rtcReady}:{lives:Live[];gifts:Gift[];loggedIn:boolean;rtcReady:boolean}){
  const router=useRouter();
  const searchParams=useSearchParams();
  const requestedLive=searchParams.get("live");
  const [active,setActive]=useState<string|null>(()=>lives.some(v=>v.id===requestedLive)?requestedLive:null);
  const [createOpen,setCreateOpen]=useState(false);
  const [error,setError]=useState("");
  const current=lives.find(v=>v.id===active)??null;

  useEffect(()=>{
    if(requestedLive&&lives.some(v=>v.id===requestedLive))setActive(requestedLive);
  },[lives,requestedLive]);

  const openLive=(id:string)=>{
    setActive(id);
    const params=new URLSearchParams(searchParams.toString());
    params.set("live",id);
    router.replace("/lives?"+params.toString(),{scroll:false});
  };

  const closeLive=()=>{
    setActive(null);
    const params=new URLSearchParams(searchParams.toString());
    params.delete("live");
    const query=params.toString();
    router.replace(query?"/lives?"+query:"/lives",{scroll:false});
  };

  const create=async(form:FormData)=>{
    if(!rtcReady){setError("RTC offline: não é possível iniciar uma live.");return;}
    try{
      setError("");
      const created=await fetch("/api/v1/lives",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
        title:String(form.get("title")??""),
        category:String(form.get("category")??"")||undefined
      })});
      const body=await created.json();
      if(!created.ok)throw new Error(body?.error?.message??"Não foi possível criar a live.");
      const started=await fetch("/api/v1/lives/"+body.data.id+"/start",{method:"POST"});
      if(!started.ok){const e=await started.json();throw new Error(e?.error?.message??"Não foi possível iniciar a live.");}
      setCreateOpen(false);
      router.refresh();
      window.setTimeout(()=>openLive(body.data.id),450);
    }catch(e){setError(e instanceof Error?e.message:"Falha ao iniciar live.");}
  };

  return <>
    <div className="live-discovery-head">
      <div className="section-tabs">
        <span className="section-tab active">Para você</span>
        <span className="section-tab">Ao vivo</span>
      </div>
      <button className="button live-go-button" disabled={!loggedIn||!rtcReady} onClick={()=>setCreateOpen(true)}>
        <span>＋</span>{!rtcReady?"RTC indisponível":loggedIn?"Transmitir LIVE":"Entre para transmitir"}
      </button>
    </div>

    {error&&<div className="error" role="alert">{error}</div>}

    {lives.length?<div className="live-discovery-grid">
      {lives.map(live=><article className="live-card-modern" key={live.id} onClick={()=>rtcReady&&openLive(live.id)}>
        <div className="live-card-cover" style={live.thumbnailUrl?{backgroundImage:"linear-gradient(180deg,transparent,rgba(0,0,0,.82)),url(\""+live.thumbnailUrl+"\")"}:undefined}>
          <div className="live-card-top">
            <span className="live-chip">LIVE</span>
            {live.battle?.status==="active"&&<span className="live-card-pk">PK</span>}
          </div>
          <div className="live-card-center"><span>▶</span></div>
          <div className="live-card-bottom">
            <div className="userrow">
              <div className="avatar sm">{live.hostDisplayName[0]?.toUpperCase()}</div>
              <div><strong>{live.hostDisplayName}</strong><span>@{live.hostUsername}</span></div>
            </div>
            <h3>{live.title}</h3>
            <div className="row">{live.category&&<span className="pill">{live.category}</span>}</div>
          </div>
        </div>
      </article>)}
    </div>:<div className="card empty"><div><div className="empty-icon">◉</div><strong>Ninguém está ao vivo agora.</strong><p>{rtcReady?"Abra a primeira LIVE e comece a conversar com a comunidade.":"As transmissões serão liberadas quando o RTC estiver configurado."}</p>{loggedIn&&rtcReady&&<button className="button compact" onClick={()=>setCreateOpen(true)}>Transmitir LIVE</button>}</div></div>}

    {createOpen&&rtcReady&&<div className="live-create-backdrop" onMouseDown={()=>setCreateOpen(false)}>
      <section className="live-create-panel tiktok-prelive" onMouseDown={e=>e.stopPropagation()}>
        <button className="seven-live-close live-create-close" onClick={()=>setCreateOpen(false)}>×</button>
        <div className="live-create-preview">
          <LiveSetupPreview/>
        </div>
        <form action={create} className="live-create-form">
          <div><span className="eyebrow">CONFIGURAR LIVE</span><h2>Antes de entrar ao vivo</h2><p className="muted">Revise câmera, microfone, título e categoria. A transmissão começa só depois de confirmar.</p></div>
          <label className="field"><span>Título da LIVE</span><input className="input" name="title" minLength={3} maxLength={120} placeholder="Adicione um título..." required/></label>
          <label className="field"><span>Categoria</span><select className="input" name="category" defaultValue="Conversa"><option>Conversa</option><option>Música</option><option>Games</option><option>Talentos</option><option>Relacionamentos</option><option>Comunidade</option><option>Outros</option></select></label>
          <div className="live-create-truth">
            <span>✓ Comentários em tempo real</span>
            <span>✓ Gifts e Fã-clube</span>
            <span>✓ Multi-convidados</span>
            <span>✓ Batalha / PK</span>
          </div>
          <button className="button full live-start-button">Entrar ao vivo</button>
        </form>
      </section>
    </div>}

    {current&&rtcReady&&<LiveExperience live={current} gifts={gifts} loggedIn={loggedIn} allLives={lives} onClose={closeLive} onEnded={()=>router.refresh()}/>}
  </>;
}
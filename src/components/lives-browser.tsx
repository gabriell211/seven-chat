"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RtcExperience } from "@/components/rtc-experience";

type Live={
  id:string;title:string;category:string|null;viewerCount:number;peakViewers:number;
  hostId:string;hostUsername:string;hostDisplayName:string;isHost:boolean;
};

export function LivesBrowser({lives,loggedIn}:{lives:Live[];loggedIn:boolean}){
  const router=useRouter();
  const [active,setActive]=useState<string|null>(null);
  const [error,setError]=useState("");

  const create=async(form:FormData)=>{
    try{
      setError("");
      const created=await fetch("/api/v1/lives",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
        title:String(form.get("title")??""),category:String(form.get("category")??"")||undefined
      })});
      const body=await created.json();
      if(!created.ok)throw new Error(body?.error?.message??"Não foi possível criar a live.");
      const started=await fetch("/api/v1/lives/"+body.data.id+"/start",{method:"POST"});
      if(!started.ok){const e=await started.json();throw new Error(e?.error?.message??"Não foi possível iniciar a live.");}
      router.refresh();setActive(body.data.id);
    }catch(e){setError(e instanceof Error?e.message:"Falha ao iniciar live.");}
  };
  const end=async(id:string)=>{
    const response=await fetch("/api/v1/lives/"+id+"/end",{method:"POST"});
    if(response.ok){setActive(null);router.refresh();}
  };

  return <div className="grid two">
    <section className="grid">
      {lives.length===0?<div className="card empty">Nenhuma live ao vivo neste momento.</div>:lives.map(live=><article className="card stack" key={live.id}>
        <div className="posthead"><div><h3 style={{margin:0}}>{live.title}</h3><div className="muted">{live.hostDisplayName} · @{live.hostUsername}</div></div><span className="pill">AO VIVO · {live.viewerCount}</span></div>
        {live.category&&<span className="pill">{live.category}</span>}
        {active===live.id?<RtcExperience resourceType="live" resourceId={live.id} mode="video" canPublishLocal={live.isHost}/>:<button className="button secondary" disabled={!loggedIn} onClick={()=>setActive(live.id)}>{loggedIn?(live.isHost?"Abrir estúdio":"Assistir"):"Entre para assistir"}</button>}
        {live.isHost&&<button className="button secondary" onClick={()=>void end(live.id)}>Encerrar live</button>}
      </article>)}
    </section>
    <aside className="card stack">
      <div><h3 style={{marginTop:0}}>Iniciar live</h3><p className="muted">Vídeo via RTC dedicado, com suporte a convidados e gifts.</p></div>
      {error&&<div className="error" role="alert">{error}</div>}
      <form action={create} className="stack">
        <input className="input" name="title" minLength={3} maxLength={120} placeholder="Título" required disabled={!loggedIn}/>
        <input className="input" name="category" maxLength={50} placeholder="Categoria" disabled={!loggedIn}/>
        <button className="button" disabled={!loggedIn}>Entrar ao vivo</button>
      </form>
    </aside>
  </div>;
}
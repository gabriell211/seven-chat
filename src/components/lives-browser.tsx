"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LiveExperience } from "@/components/live-experience";

type Live={
  id:string;title:string;category:string|null;viewerCount:number;peakViewers:number;
  thumbnailUrl:string|null;hostId:string;hostUsername:string;hostDisplayName:string;isHost:boolean;
};
type Gift={id:string;name:string;priceDiamonds:number;category:string;animationType:string;assetUrl:string|null};

export function LivesBrowser({lives,gifts,loggedIn}:{lives:Live[];gifts:Gift[];loggedIn:boolean}){
  const router=useRouter();
  const [active,setActive]=useState<string|null>(null);
  const [createOpen,setCreateOpen]=useState(false);
  const [error,setError]=useState("");
  const current=lives.find(v=>v.id===active)??null;

  const create=async(form:FormData)=>{
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
      window.setTimeout(()=>setActive(body.data.id),350);
    }catch(e){setError(e instanceof Error?e.message:"Falha ao iniciar live.");}
  };

  return <>
    <div className="live-discovery-head">
      <div className="section-tabs">
        <span className="section-tab active">Para você</span>
        <span className="section-tab">Seguindo</span>
        <span className="section-tab">Batalhas</span>
      </div>
      <button className="button" disabled={!loggedIn} onClick={()=>setCreateOpen(true)}>
        {loggedIn?"Iniciar live":"Entre para transmitir"}
      </button>
    </div>

    {error&&<div className="error" role="alert">{error}</div>}

    {lives.length?<div className="live-discovery-grid">
      {lives.map(live=><article className="live-card-modern" key={live.id} onClick={()=>setActive(live.id)}>
        <div className="live-card-cover" style={live.thumbnailUrl?{backgroundImage:`linear-gradient(180deg,transparent,rgba(0,0,0,.8)),url("${live.thumbnailUrl}")`}:undefined}>
          <div className="live-card-top"><span className="live-chip">AO VIVO</span><span className="live-card-viewers">{live.viewerCount.toLocaleString("pt-BR")}</span></div>
          <div className="live-card-center"><span>▶</span></div>
          <div className="live-card-bottom">
            <div className="userrow"><div className="avatar sm">{live.hostDisplayName[0]?.toUpperCase()}</div><div><strong>{live.hostDisplayName}</strong><span>@{live.hostUsername}</span></div></div>
            <h3>{live.title}</h3>
            <div className="row">{live.category&&<span className="pill">{live.category}</span>}<span className="pill">Pico {live.peakViewers}</span></div>
          </div>
        </div>
      </article>)}
    </div>:<div className="card empty"><div><div className="empty-icon">◉</div><strong>Ninguém está ao vivo agora.</strong><p>Você pode abrir a primeira transmissão e começar a conversa.</p>{loggedIn&&<button className="button compact" onClick={()=>setCreateOpen(true)}>Iniciar live</button>}</div></div>}

    {createOpen&&<div className="live-create-backdrop" onMouseDown={()=>setCreateOpen(false)}>
      <section className="live-create-panel" onMouseDown={e=>e.stopPropagation()}>
        <button className="seven-live-close live-create-close" onClick={()=>setCreateOpen(false)}>×</button>
        <div className="live-create-preview">
          <div className="live-create-camera">
            <span className="live-chip">PRÉVIA</span>
            <div><strong>Sua câmera aparecerá aqui ao iniciar</strong><p>O navegador pedirá acesso à câmera e ao microfone quando o estúdio conectar.</p></div>
          </div>
          <div className="live-create-devices"><span>◉ Câmera</span><span>⌁ Microfone</span><span>⚙ Qualidade automática</span></div>
        </div>
        <form action={create} className="live-create-form">
          <div><span className="eyebrow">CRIAR LIVE</span><h2>Prepare sua transmissão</h2><p className="muted">Escolha um título claro e uma categoria para ajudar as pessoas a encontrar sua live.</p></div>
          <label className="field"><span>Título da live</span><input className="input" name="title" minLength={3} maxLength={120} placeholder="O que vai acontecer nessa live?" required/></label>
          <label className="field"><span>Categoria</span><select className="input" name="category" defaultValue="Conversa"><option>Conversa</option><option>Música</option><option>Games</option><option>Talentos</option><option>Relacionamentos</option><option>Comunidade</option><option>Outros</option></select></label>
          <div className="live-create-options">
            <span><b>Comentários</b><small>Ativados</small></span>
            <span><b>Gifts</b><small>Ativados</small></span>
            <span><b>Convidados</b><small>Até 4</small></span>
            <span><b>PK</b><small>Disponível</small></span>
          </div>
          <button className="button full">Entrar ao vivo</button>
        </form>
      </section>
    </div>}

    {current&&<LiveExperience
      live={current}
      gifts={gifts}
      loggedIn={loggedIn}
      allLives={lives}
      onClose={()=>setActive(null)}
      onEnded={()=>router.refresh()}
    />}
  </>;
}

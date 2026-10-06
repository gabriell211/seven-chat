"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LiveStage,
  type LiveFanProduct,
  type LiveGift,
  type LiveItem,
  type LiveSuggestedUser
} from "@/components/live-stage";

export function LivesBrowser({
  lives,
  gifts,
  fanProducts,
  suggestedUsers,
  loggedIn,
  currentUserId,
  initialLiveId
}:{
  lives:LiveItem[];
  gifts:LiveGift[];
  fanProducts:LiveFanProduct[];
  suggestedUsers:LiveSuggestedUser[];
  loggedIn:boolean;
  currentUserId:string;
  initialLiveId:string|null;
}){
  const router=useRouter();
  const [activeId,setActiveId]=useState<string|null>(
    initialLiveId&&lives.some(live=>live.id===initialLiveId)?initialLiveId:null
  );
  const [creatorOpen,setCreatorOpen]=useState(false);
  const [error,setError]=useState("");
  const [creating,setCreating]=useState(false);
  const [localLives,setLocalLives]=useState(lives);

  useEffect(()=>{
    setLocalLives(lives);
    if(initialLiveId&&lives.some(live=>live.id===initialLiveId)){
      setActiveId(initialLiveId);
    }
  },[initialLiveId,lives]);

  const active=useMemo(
    ()=>localLives.find(live=>live.id===activeId)??null,
    [activeId,localLives]
  );

  const openLive=(id:string)=>{
    if(!loggedIn){
      router.push("/login");
      return;
    }

    setActiveId(id);
    router.replace("/lives?live="+id,{scroll:false});
  };

  const closeLive=()=>{
    setActiveId(null);
    router.replace("/lives",{scroll:false});
  };

  const create=async(form:FormData)=>{
    try{
      setCreating(true);
      setError("");

      const created=await fetch("/api/v1/lives",{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({
          title:String(form.get("title")??""),
          category:String(form.get("category")??"")||undefined
        })
      });

      const body=await created.json();
      if(!created.ok){
        throw new Error(body?.error?.message??"Não foi possível criar a LIVE.");
      }

      const started=await fetch("/api/v1/lives/"+body.data.id+"/start",{method:"POST"});
      if(!started.ok){
        const startBody=await started.json();
        throw new Error(startBody?.error?.message??"Não foi possível iniciar a LIVE.");
      }

      setCreatorOpen(false);
      router.replace("/lives?live="+body.data.id,{scroll:false});
      router.refresh();
    }catch(e){
      setError(e instanceof Error?e.message:"Falha ao iniciar LIVE.");
    }finally{
      setCreating(false);
    }
  };

  const removeEnded=(id:string)=>{
    setLocalLives(current=>current.filter(live=>live.id!==id));
  };

  return <>
    <section className="live-discovery">
      <div className="live-discovery-toolbar">
        <div className="live-filter-row">
          <button className="live-filter is-active">Para você</button>
          <button className="live-filter">Seguindo</button>
          <button className="live-filter">Populares</button>
          <button className="live-filter">Conversas</button>
          <button className="live-filter">Games</button>
        </div>

        <button
          className="button compact"
          onClick={()=>loggedIn?setCreatorOpen(true):router.push("/login")}
        >
          + Iniciar LIVE
        </button>
      </div>

      {error&&<div className="error" role="alert">{error}</div>}

      {localLives.length===0
        ?<div className="card live-empty-state">
          <div className="live-empty-orb">◉</div>
          <div>
            <span className="eyebrow">AGORA</span>
            <h2>Ninguém está ao vivo neste momento.</h2>
            <p>Abra a primeira LIVE ou volte em alguns minutos para descobrir novas transmissões.</p>
          </div>
          <button
            className="button"
            onClick={()=>loggedIn?setCreatorOpen(true):router.push("/login")}
          >
            Começar uma LIVE
          </button>
        </div>
        :<div className="live-card-grid">
          {localLives.map((live,index)=><article
            className={"live-preview-card "+(index===0?"is-featured":"")}
            key={live.id}
          >
            <button
              className="live-preview-hit"
              onClick={()=>openLive(live.id)}
              aria-label={"Abrir LIVE de "+live.hostDisplayName}
            />

            <div className="live-preview-visual">
              <div className="live-preview-bg">
                {live.hostDisplayName.slice(0,1).toUpperCase()}
              </div>

              <div className="live-preview-top">
                <span className="live-badge">LIVE</span>
                <span className="live-preview-viewers">◉ {live.viewerCount}</span>
              </div>

              <div className="live-preview-gradient"/>

              <div className="live-preview-bottom">
                <div className="live-preview-avatar">
                  {live.hostDisplayName.slice(0,1).toUpperCase()}
                </div>
                <div>
                  <strong>{live.hostDisplayName}</strong>
                  <span>@{live.hostUsername}</span>
                </div>
              </div>
            </div>

            <div className="live-preview-copy">
              <strong>{live.title}</strong>
              <div>
                {live.category&&<span className="pill">{live.category}</span>}
                <span className="muted">Pico {live.peakViewers}</span>
              </div>
            </div>
          </article>)}
        </div>
      }
    </section>

    {creatorOpen&&<div
      className="live-sheet-backdrop live-creator-backdrop"
      onClick={()=>setCreatorOpen(false)}
    >
      <section className="live-creator-studio" onClick={event=>event.stopPropagation()}>
        <div className="live-sheet-head">
          <div>
            <span className="eyebrow">CRIADOR</span>
            <h2>Preparar LIVE</h2>
          </div>
          <button onClick={()=>setCreatorOpen(false)}>×</button>
        </div>

        <div className="live-creator-grid">
          <div className="live-creator-preview">
            <div className="live-creator-preview-orb">◉</div>
            <strong>Prévia do estúdio</strong>
            <span>
              A câmera e o microfone serão liberados no palco depois que a transmissão começar.
            </span>
          </div>

          <form action={create} className="live-creator-form">
            <label className="field">
              <span>Título da LIVE</span>
              <input
                className="input"
                name="title"
                minLength={3}
                maxLength={120}
                placeholder="Sobre o que você vai falar?"
                required
              />
            </label>

            <label className="field">
              <span>Categoria</span>
              <input
                className="input"
                name="category"
                maxLength={50}
                placeholder="Ex.: conversa, música, games"
              />
            </label>

            <div className="live-preflight-list">
              <div>
                <span>✓</span>
                <div><strong>Chat ao vivo</strong><small>Comentários reais com moderação.</small></div>
              </div>
              <div>
                <span>✓</span>
                <div><strong>Convidados</strong><small>Até 4 pessoas no palco.</small></div>
              </div>
              <div>
                <span>✓</span>
                <div><strong>Presentes e batalhas</strong><small>Integração com carteira e placar.</small></div>
              </div>
              <div>
                <span>✓</span>
                <div><strong>RTC</strong><small>Câmera e microfone pela infraestrutura LiveKit.</small></div>
              </div>
            </div>

            <button className="button full live-go-button" disabled={creating}>
              {creating?"Preparando…":"Entrar AO VIVO"}
            </button>
          </form>
        </div>
      </section>
    </div>}

    {active&&<LiveStage
      live={active}
      lives={localLives}
      gifts={gifts}
      fanProducts={fanProducts}
      suggestedUsers={suggestedUsers}
      currentUserId={currentUserId}
      onClose={closeLive}
      onEnded={removeEnded}
    />}
  </>;
}

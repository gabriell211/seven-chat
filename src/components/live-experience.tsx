"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { RtcExperience } from "@/components/rtc-experience";
import { FollowButton } from "@/components/follow-button";

type Live={
  id:string;title:string;category:string|null;viewerCount:number;peakViewers:number;
  thumbnailUrl:string|null;hostId:string;hostUsername:string;hostDisplayName:string;isHost:boolean;
};
type Gift={id:string;name:string;priceDiamonds:number;category:string;animationType:string;assetUrl:string|null};
type Comment={id:string;body:string;pinned:boolean;createdAt:string;authorId:string;username:string;displayName:string};

async function api<T>(url:string,init?:RequestInit):Promise<T>{
  const response=await fetch(url,{...init,headers:{"content-type":"application/json",...(init?.headers??{})}});
  const body=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(body?.error?.message??"Não foi possível concluir a ação.");
  return body as T;
}

export function LiveExperience({
  live,gifts,loggedIn,allLives,onClose,onEnded
}:{
  live:Live;gifts:Gift[];loggedIn:boolean;allLives:Live[];
  onClose:()=>void;onEnded:()=>void;
}){
  const [comments,setComments]=useState<Comment[]>([]);
  const [comment,setComment]=useState("");
  const [giftOpen,setGiftOpen]=useState(false);
  const [pkOpen,setPkOpen]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const opponents=useMemo(()=>allLives.filter(v=>v.id!==live.id),[allLives,live.id]);

  const loadComments=useCallback(async()=>{
    try{
      const body=await api<{data:Comment[]}>(`/api/v1/lives/${live.id}/comments`);
      setComments(body.data);
    }catch{}
  },[live.id]);

  useEffect(()=>{
    void loadComments();
    const timer=window.setInterval(()=>void loadComments(),2500);
    return ()=>window.clearInterval(timer);
  },[loadComments]);

  async function sendComment(e:FormEvent){
    e.preventDefault();
    const body=comment.trim();
    if(!body)return;
    try{
      setBusy(true);setError("");
      await api(`/api/v1/lives/${live.id}/comments`,{method:"POST",body:JSON.stringify({body})});
      setComment("");await loadComments();
    }catch(e){setError(e instanceof Error?e.message:"Falha ao comentar.");}
    finally{setBusy(false);}
  }

  async function sendGift(giftId:string){
    try{
      setBusy(true);setError("");
      await api("/api/v1/gifts/send",{method:"POST",body:JSON.stringify({
        contextType:"live",liveId:live.id,giftId,quantity:1,
        idempotencyKey:crypto.randomUUID()+crypto.randomUUID()
      })});
      setGiftOpen(false);
    }catch(e){setError(e instanceof Error?e.message:"Falha ao enviar gift.");}
    finally{setBusy(false);}
  }

  async function startBattle(opponentLiveId:string){
    try{
      setBusy(true);setError("");
      await api(`/api/v1/lives/${live.id}/battles`,{method:"POST",body:JSON.stringify({opponentLiveId,durationSeconds:180})});
      setPkOpen(false);
    }catch(e){setError(e instanceof Error?e.message:"Falha ao convidar para PK.");}
    finally{setBusy(false);}
  }

  async function shareLive(){
    const url=location.origin+"/lives";
    try{
      if(navigator.share)await navigator.share({title:live.title,text:"Assista esta live no Seven Chat",url});
      else{await navigator.clipboard.writeText(url);setError("Link da live copiado.");}
    }catch{}
  }

  async function endLive(){
    try{
      setBusy(true);setError("");
      await api(`/api/v1/lives/${live.id}/end`,{method:"POST"});
      onEnded();onClose();
    }catch(e){setError(e instanceof Error?e.message:"Falha ao encerrar live.");}
    finally{setBusy(false);}
  }

  return <div className="seven-live-viewer">
    <div className="seven-live-stage">
      <RtcExperience resourceType="live" resourceId={live.id} mode="video" canPublishLocal={live.isHost}/>
      <div className="seven-live-top">
        <div className="seven-live-host">
          <div className="avatar sm">{live.hostDisplayName[0]?.toUpperCase()}</div>
          <div><strong>{live.hostDisplayName}</strong><span>@{live.hostUsername}</span></div>
          {!live.isHost&&loggedIn&&<FollowButton userId={live.hostId} initialFollowing={false}/>}
        </div>
        <div className="seven-live-top-actions">
          <span className="live-chip">{live.viewerCount.toLocaleString("pt-BR")} assistindo</span>
          <button className="seven-live-close" onClick={onClose} aria-label="Fechar live">×</button>
        </div>
      </div>

      <div className="seven-live-title">
        <strong>{live.title}</strong>
        {live.category&&<span>{live.category}</span>}
      </div>

      <div className="seven-live-comments">
        {comments.slice(-7).map(c=><div className="seven-live-comment" key={c.id}>
          <b>{c.displayName}</b> <span>{c.body}</span>
        </div>)}
      </div>

      <div className="seven-live-rail">
        <button onClick={()=>setGiftOpen(v=>!v)} title="Enviar gift">◇<small>Gift</small></button>
        {live.isHost&&<button onClick={()=>setPkOpen(v=>!v)} title="Iniciar batalha">⚔<small>PK</small></button>}
        <button onClick={()=>void shareLive()} title="Compartilhar">↗<small>Compartilhar</small></button>
      </div>

      <form className="seven-live-compose" onSubmit={sendComment}>
        <input value={comment} onChange={e=>setComment(e.target.value)} maxLength={500} placeholder={loggedIn?"Diga algo...":"Entre para comentar"} disabled={!loggedIn||busy}/>
        <button disabled={!loggedIn||busy||!comment.trim()}>Enviar</button>
      </form>

      {error&&<div className="seven-live-error">{error}</div>}

      {giftOpen&&<div className="seven-live-sheet">
        <div className="row between"><div><span className="eyebrow">GIFTS</span><h3>Envie um presente</h3></div><button className="seven-live-close" onClick={()=>setGiftOpen(false)}>×</button></div>
        <div className="seven-live-gifts">
          {gifts.length?gifts.map(g=><button key={g.id} disabled={!loggedIn||busy} onClick={()=>void sendGift(g.id)}>
            <span className="gift-icon">◇</span><strong>{g.name}</strong><small>◇ {g.priceDiamonds}</small>
          </button>):<p className="muted">Nenhum gift ativo.</p>}
        </div>
      </div>}

      {pkOpen&&live.isHost&&<div className="seven-live-sheet">
        <div className="row between"><div><span className="eyebrow">BATALHA / PK</span><h3>Escolha uma live</h3></div><button className="seven-live-close" onClick={()=>setPkOpen(false)}>×</button></div>
        <div className="seven-live-opponents">
          {opponents.length?opponents.map(v=><button key={v.id} disabled={busy} onClick={()=>void startBattle(v.id)}>
            <div className="avatar sm">{v.hostDisplayName[0]?.toUpperCase()}</div>
            <div><strong>{v.hostDisplayName}</strong><small>{v.title}</small></div>
            <span>Desafiar</span>
          </button>):<p className="muted">Nenhuma outra live disponível para PK agora.</p>}
        </div>
      </div>}

      {live.isHost&&<div className="seven-live-hostbar">
        <span>Estúdio do criador</span>
        <button className="button secondary compact" onClick={()=>void endLive()} disabled={busy}>Encerrar live</button>
      </div>}
    </div>
  </div>;
}

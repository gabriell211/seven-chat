"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { RtcExperience } from "@/components/rtc-experience";
import { FollowButton } from "@/components/follow-button";

type Battle={
  id:string;status:string;liveAId:string;liveBId:string;scoreA:number;scoreB:number;
  durationSeconds:number;startsAt:string|null;endsAt:string|null;
};
type Live={
  id:string;title:string;category:string|null;viewerCount:number;peakViewers:number;
  thumbnailUrl:string|null;hostId:string;hostUsername:string;hostDisplayName:string;
  isHost:boolean;canPublish:boolean;initialFollowing:boolean;battle:Battle|null;
};
type Gift={id:string;name:string;priceDiamonds:number;category:string;animationType:string;assetUrl:string|null};
type Comment={id:string;body:string;pinned:boolean;createdAt:string;authorId:string;username:string;displayName:string};

async function api<T>(url:string,init:RequestInit={}):Promise<T>{
  const response=await fetch(url,{...init,headers:{"content-type":"application/json",...(init.headers??{})}});
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
  const [guestOpen,setGuestOpen]=useState(false);
  const [guestQuery,setGuestQuery]=useState("");
  const [guestResults,setGuestResults]=useState<Array<{id:string;username:string;displayName:string}>>([]);
  const [battle,setBattle]=useState<Battle|null>(live.battle);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const opponents=useMemo(()=>allLives.filter(v=>v.id!==live.id),[allLives,live.id]);

  const loadComments=useCallback(async()=>{
    try{
      const body=await api<{data:Comment[]}>(`/api/v1/lives/${live.id}/comments`);
      setComments(body.data);
    }catch{}
  },[live.id]);

  const loadBattle=useCallback(async()=>{
    if(!battle?.id)return;
    try{
      const body=await api<{data:Battle}>(`/api/v1/lives/battles/${battle.id}`);
      if(["rejected","ended"].includes(body.data.status))setBattle(null);
      else setBattle({
        id:body.data.id,status:body.data.status,liveAId:body.data.liveAId,liveBId:body.data.liveBId,
        scoreA:body.data.scoreA,scoreB:body.data.scoreB,durationSeconds:body.data.durationSeconds,
        startsAt:body.data.startsAt?new Date(body.data.startsAt).toISOString():null,
        endsAt:body.data.endsAt?new Date(body.data.endsAt).toISOString():null
      });
    }catch{}
  },[battle?.id]);

  useEffect(()=>{
    void loadComments();
    const timer=window.setInterval(()=>void loadComments(),2500);
    return ()=>window.clearInterval(timer);
  },[loadComments]);

  useEffect(()=>{
    if(!battle?.id)return;
    const timer=window.setInterval(()=>void loadBattle(),2000);
    return ()=>window.clearInterval(timer);
  },[battle?.id,loadBattle]);

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
      await loadBattle();
    }catch(e){setError(e instanceof Error?e.message:"Falha ao enviar gift.");}
    finally{setBusy(false);}
  }

  async function searchGuests(){
    const q=guestQuery.trim();if(q.length<2)return;
    try{
      setBusy(true);setError("");
      const body=await api<{data:{users:Array<{id:string;username:string;displayName:string}>}}>(`/api/v1/search?q=${encodeURIComponent(q)}`);
      setGuestResults(body.data.users.filter(v=>v.id!==live.hostId));
    }catch(e){setError(e instanceof Error?e.message:"Falha ao buscar usuários.");}
    finally{setBusy(false);}
  }

  async function inviteGuest(userId:string){
    try{
      setBusy(true);setError("");
      await api(`/api/v1/lives/${live.id}/guests`,{method:"POST",body:JSON.stringify({userId})});
      setError("Convite enviado.");
    }catch(e){setError(e instanceof Error?e.message:"Falha ao convidar.");}
    finally{setBusy(false);}
  }

  async function startBattle(opponentLiveId:string){
    try{
      setBusy(true);setError("");
      const body=await api<{data:{battleId:string;status:string}}>(`/api/v1/lives/${live.id}/battles`,{
        method:"POST",body:JSON.stringify({opponentLiveId,durationSeconds:180})
      });
      setBattle({
        id:body.data.battleId,status:body.data.status,liveAId:live.id,liveBId:opponentLiveId,
        scoreA:0,scoreB:0,durationSeconds:180,startsAt:null,endsAt:null
      });
      setPkOpen(false);
    }catch(e){setError(e instanceof Error?e.message:"Falha ao convidar para PK.");}
    finally{setBusy(false);}
  }

  async function battleAction(action:"accept"|"reject"|"end"){
    if(!battle)return;
    try{
      setBusy(true);setError("");
      await api(`/api/v1/lives/battles/${battle.id}`,{method:"PATCH",body:JSON.stringify({action})});
      await loadBattle();
    }catch(e){setError(e instanceof Error?e.message:"Falha ao atualizar batalha.");}
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
      <RtcExperience resourceType="live" resourceId={live.id} mode="video" canPublishLocal={live.canPublish}/>

      <div className="seven-live-top">
        <div className="seven-live-host">
          <div className="avatar sm">{live.hostDisplayName[0]?.toUpperCase()}</div>
          <div><strong>{live.hostDisplayName}</strong><span>@{live.hostUsername}</span></div>
          {!live.isHost&&loggedIn&&<FollowButton userId={live.hostId} initialFollowing={live.initialFollowing}/>}
        </div>
        <div className="seven-live-top-actions">
          <span className="live-chip">AO VIVO</span>
          <button className="seven-live-close" onClick={onClose} aria-label="Fechar live">×</button>
        </div>
      </div>

      {battle&&<div className="seven-live-battlebar">
        {battle.status==="invited"?<>
          <strong>PK aguardando aceite</strong>
          {live.isHost&&battle.liveBId===live.id&&<div className="row"><button className="button compact" disabled={busy} onClick={()=>void battleAction("accept")}>Aceitar</button><button className="button secondary compact" disabled={busy} onClick={()=>void battleAction("reject")}>Recusar</button></div>}
        </>:<>
          <div><b>{battle.scoreA.toLocaleString("pt-BR")}</b><span>PK</span><b>{battle.scoreB.toLocaleString("pt-BR")}</b></div>
          {live.isHost&&<button className="button secondary compact" disabled={busy} onClick={()=>void battleAction("end")}>Encerrar PK</button>}
        </>}
      </div>}

      <div className="seven-live-title">
        <strong>{live.title}</strong>
        {live.category&&<span>{live.category}</span>}
      </div>

      <div className="seven-live-comments">
        {comments.slice(-7).map(c=><div className="seven-live-comment" key={c.id}><b>{c.displayName}</b> <span>{c.body}</span></div>)}
      </div>

      <div className="seven-live-rail">
        <button onClick={()=>setGiftOpen(v=>!v)} title="Enviar gift">◇<small>Gift</small></button>
        {live.isHost&&<button onClick={()=>setGuestOpen(v=>!v)} title="Convidar participante">＋<small>Convidar</small></button>}
        {live.isHost&&!battle&&<button onClick={()=>setPkOpen(v=>!v)} title="Iniciar batalha">⚔<small>PK</small></button>}
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
          {gifts.length?gifts.map(g=><button key={g.id} disabled={!loggedIn||busy||live.isHost} onClick={()=>void sendGift(g.id)}>
            <span className="gift-icon">◇</span><strong>{g.name}</strong><small>◇ {g.priceDiamonds}</small>
          </button>):<p className="muted">Nenhum gift ativo.</p>}
        </div>
        {live.isHost&&<p className="muted">O host não pode enviar gift para si mesmo.</p>}
      </div>}

      {guestOpen&&live.isHost&&<div className="seven-live-sheet">
        <div className="row between"><div><span className="eyebrow">CONVIDADOS</span><h3>Convidar para a live</h3></div><button className="seven-live-close" onClick={()=>setGuestOpen(false)}>×</button></div>
        <div className="row" style={{marginTop:12}}><input className="input" value={guestQuery} onChange={e=>setGuestQuery(e.target.value)} placeholder="Nome ou @usuário"/><button className="button compact" onClick={()=>void searchGuests()} disabled={busy||guestQuery.trim().length<2}>Buscar</button></div>
        <div className="seven-live-opponents">{guestResults.length?guestResults.map(v=><button key={v.id} disabled={busy} onClick={()=>void inviteGuest(v.id)}><div className="avatar sm">{v.displayName[0]?.toUpperCase()}</div><div><strong>{v.displayName}</strong><small>@{v.username}</small></div><span>Convidar</span></button>):<p className="muted">Busque uma pessoa para enviar o convite.</p>}</div>
      </div>}

      {pkOpen&&live.isHost&&!battle&&<div className="seven-live-sheet">
        <div className="row between"><div><span className="eyebrow">BATALHA / PK</span><h3>Escolha uma live</h3></div><button className="seven-live-close" onClick={()=>setPkOpen(false)}>×</button></div>
        <div className="seven-live-opponents">
          {opponents.length?opponents.map(v=><button key={v.id} disabled={busy} onClick={()=>void startBattle(v.id)}><div className="avatar sm">{v.hostDisplayName[0]?.toUpperCase()}</div><div><strong>{v.hostDisplayName}</strong><small>{v.title}</small></div><span>Desafiar</span></button>):<p className="muted">Nenhuma outra live disponível para PK agora.</p>}
        </div>
      </div>}

      {live.isHost&&<div className="seven-live-hostbar"><span>Estúdio do criador</span><button className="button secondary compact" onClick={()=>void endLive()} disabled={busy}>Encerrar live</button></div>}
    </div>
  </div>;
}

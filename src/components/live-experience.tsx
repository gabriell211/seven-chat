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
type GuestEntry={userId:string;username:string;displayName:string;status:string;role:string;joinedAt:string|null};
type FanProduct={code:string;tier:string;durationDays:number;priceDiamonds:number};
type WalletState={balance:number;gifts:Gift[]};

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
  const [fanOpen,setFanOpen]=useState(false);
  const [moreOpen,setMoreOpen]=useState(false);
  const [guestQuery,setGuestQuery]=useState("");
  const [guestResults,setGuestResults]=useState<Array<{id:string;username:string;displayName:string}>>([]);
  const [hostGuests,setHostGuests]=useState<GuestEntry[]>([]);
  const [guestStatus,setGuestStatus]=useState<string|null>(live.canPublish&&!live.isHost?"accepted":null);
  const [canPublish,setCanPublish]=useState(live.canPublish);
  const [layout,setLayout]=useState<"panel"|"grid">("panel");
  const [battle,setBattle]=useState<Battle|null>(live.battle);
  const [wallet,setWallet]=useState<WalletState|null>(null);
  const [fanProducts,setFanProducts]=useState<FanProduct[]>([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [now,setNow]=useState(Date.now());
  const opponents=useMemo(()=>allLives.filter(v=>v.id!==live.id),[allLives,live.id]);
  const pinned=comments.find(c=>c.pinned)??null;

  const loadComments=useCallback(async()=>{
    try{
      const body=await api<{data:Comment[]}>("/api/v1/lives/"+live.id+"/comments");
      setComments(body.data);
    }catch{}
  },[live.id]);

  const loadBattle=useCallback(async()=>{
    if(!battle?.id)return;
    try{
      const body=await api<{data:Battle}>("/api/v1/lives/battles/"+battle.id);
      if(["rejected","ended"].includes(body.data.status))setBattle(null);
      else setBattle({
        id:body.data.id,status:body.data.status,liveAId:body.data.liveAId,liveBId:body.data.liveBId,
        scoreA:body.data.scoreA,scoreB:body.data.scoreB,durationSeconds:body.data.durationSeconds,
        startsAt:body.data.startsAt?new Date(body.data.startsAt).toISOString():null,
        endsAt:body.data.endsAt?new Date(body.data.endsAt).toISOString():null
      });
    }catch{}
  },[battle?.id]);

  const loadGuestStatus=useCallback(async()=>{
    if(!loggedIn||live.isHost)return;
    try{
      const body=await api<{data:{status:string}|null}>("/api/v1/lives/"+live.id+"/guests/me");
      const status=body.data?.status??null;
      setGuestStatus(status);
      if(status==="accepted"&&!canPublish)setCanPublish(true);
      if(["left","removed","rejected","cancelled"].includes(status??"")&&canPublish)setCanPublish(false);
    }catch{}
  },[canPublish,live.id,live.isHost,loggedIn]);

  const loadHostGuests=useCallback(async()=>{
    if(!live.isHost)return;
    try{
      const body=await api<{data:GuestEntry[]}>("/api/v1/lives/"+live.id+"/guests");
      setHostGuests(body.data);
    }catch{}
  },[live.id,live.isHost]);

  useEffect(()=>{
    void loadComments();
    const timer=window.setInterval(()=>void loadComments(),1800);
    return ()=>window.clearInterval(timer);
  },[loadComments]);

  useEffect(()=>{
    if(!battle?.id)return;
    const timer=window.setInterval(()=>{setNow(Date.now());void loadBattle();},1000);
    return ()=>window.clearInterval(timer);
  },[battle?.id,loadBattle]);

  useEffect(()=>{
    if(live.isHost){
      void loadHostGuests();
      const timer=window.setInterval(()=>void loadHostGuests(),2200);
      return ()=>window.clearInterval(timer);
    }
    if(loggedIn){
      void loadGuestStatus();
      const timer=window.setInterval(()=>void loadGuestStatus(),2200);
      return ()=>window.clearInterval(timer);
    }
  },[live.isHost,loadGuestStatus,loadHostGuests,loggedIn]);

  const battleRemaining=battle?.endsAt?Math.max(0,Math.ceil((new Date(battle.endsAt).getTime()-now)/1000)):battle?.durationSeconds??0;
  const battleClock=String(Math.floor(battleRemaining/60)).padStart(2,"0")+":"+String(battleRemaining%60).padStart(2,"0");

  async function sendComment(e:FormEvent){
    e.preventDefault();
    const body=comment.trim();
    if(!body)return;
    try{
      setBusy(true);setError("");
      await api("/api/v1/lives/"+live.id+"/comments",{method:"POST",body:JSON.stringify({body})});
      setComment("");await loadComments();
    }catch(e){setError(e instanceof Error?e.message:"Falha ao comentar.");}
    finally{setBusy(false);}
  }

  async function openGifts(){
    setGiftOpen(true);setError("");
    if(!loggedIn)return;
    try{
      const body=await api<{data:WalletState}>("/api/v1/wallet");
      setWallet(body.data);
    }catch{}
  }

  async function sendGift(giftId:string){
    try{
      setBusy(true);setError("");
      await api("/api/v1/gifts/send",{method:"POST",body:JSON.stringify({
        contextType:"live",liveId:live.id,giftId,quantity:1,
        idempotencyKey:crypto.randomUUID()+crypto.randomUUID()
      })});
      const body=await api<{data:WalletState}>("/api/v1/wallet");
      setWallet(body.data);
      await loadBattle();
    }catch(e){setError(e instanceof Error?e.message:"Falha ao enviar gift.");}
    finally{setBusy(false);}
  }

  async function requestGuest(){
    if(!loggedIn){location.href="/login";return;}
    try{
      setBusy(true);setError("");
      const body=await api<{data:{status:string}}>("/api/v1/lives/"+live.id+"/guests/request",{method:"POST"});
      setGuestStatus(body.data.status);
    }catch(e){setError(e instanceof Error?e.message:"Falha ao pedir participação.");}
    finally{setBusy(false);}
  }

  async function cancelGuestRequest(){
    try{
      setBusy(true);setError("");
      const body=await api<{data:{status:string}}>("/api/v1/lives/"+live.id+"/guests/me",{method:"PATCH",body:JSON.stringify({action:"cancel_request"})});
      setGuestStatus(body.data.status);
    }catch(e){setError(e instanceof Error?e.message:"Falha ao cancelar pedido.");}
    finally{setBusy(false);}
  }

  async function leaveStage(){
    try{
      setBusy(true);setError("");
      await api("/api/v1/lives/"+live.id+"/guests/me",{method:"PATCH",body:JSON.stringify({action:"leave"})});
      setGuestStatus("left");setCanPublish(false);
    }catch(e){setError(e instanceof Error?e.message:"Falha ao sair do palco.");}
    finally{setBusy(false);}
  }

  async function searchGuests(){
    const q=guestQuery.trim();if(q.length<2)return;
    try{
      setBusy(true);setError("");
      const body=await api<{data:{users:Array<{id:string;username:string;displayName:string}>}}>("/api/v1/search?q="+encodeURIComponent(q));
      setGuestResults(body.data.users.filter(v=>v.id!==live.hostId));
    }catch(e){setError(e instanceof Error?e.message:"Falha ao buscar usuários.");}
    finally{setBusy(false);}
  }

  async function inviteGuest(userId:string){
    try{
      setBusy(true);setError("");
      await api("/api/v1/lives/"+live.id+"/guests",{method:"POST",body:JSON.stringify({userId})});
      await loadHostGuests();setError("Convite enviado.");
    }catch(e){setError(e instanceof Error?e.message:"Falha ao convidar.");}
    finally{setBusy(false);}
  }

  async function hostGuestAction(userId:string,action:"accept"|"reject"|"remove"){
    try{
      setBusy(true);setError("");
      if(action==="remove")await api("/api/v1/lives/"+live.id+"/guests/"+userId,{method:"DELETE"});
      else await api("/api/v1/lives/"+live.id+"/guests/"+userId,{method:"PATCH",body:JSON.stringify({action})});
      await loadHostGuests();
    }catch(e){setError(e instanceof Error?e.message:"Falha ao atualizar convidado.");}
    finally{setBusy(false);}
  }

  async function moderate(action:"pin_comment"|"delete_comment"|"ban_user",commentItem:Comment){
    try{
      setBusy(true);setError("");
      const payload=action==="ban_user"?{action,userId:commentItem.authorId,reason:"live moderation"}:{action,commentId:commentItem.id};
      await api("/api/v1/lives/"+live.id+"/moderation",{method:"POST",body:JSON.stringify(payload)});
      await loadComments();
    }catch(e){setError(e instanceof Error?e.message:"Falha na moderação.");}
    finally{setBusy(false);}
  }

  async function setModerator(userId:string){
    try{
      setBusy(true);setError("");
      await api("/api/v1/lives/"+live.id+"/moderators/"+userId,{method:"PUT"});
      setError("Moderador adicionado.");
    }catch(e){setError(e instanceof Error?e.message:"Falha ao definir moderador.");}
    finally{setBusy(false);}
  }

  async function reportLive(reason:"spam"|"harassment"|"sexual"|"violence"|"other"){
    if(!loggedIn){location.href="/login";return;}
    try{
      setBusy(true);setError("");
      await api("/api/v1/reports",{method:"POST",body:JSON.stringify({targetType:"live",targetId:live.id,reason})});
      setMoreOpen(false);setError("Denúncia enviada para análise.");
    }catch(e){setError(e instanceof Error?e.message:"Falha ao denunciar.");}
    finally{setBusy(false);}
  }

  async function blockHost(){
    if(!loggedIn){location.href="/login";return;}
    try{
      setBusy(true);setError("");
      await api("/api/v1/users/"+live.hostId+"/block",{method:"POST"});
      setMoreOpen(false);onClose();
    }catch(e){setError(e instanceof Error?e.message:"Falha ao bloquear usuário.");}
    finally{setBusy(false);}
  }

  async function startBattle(opponentLiveId:string){
    try{
      setBusy(true);setError("");
      const body=await api<{data:{battleId:string;status:string}}>("/api/v1/lives/"+live.id+"/battles",{
        method:"POST",body:JSON.stringify({opponentLiveId,durationSeconds:180})
      });
      setBattle({id:body.data.battleId,status:body.data.status,liveAId:live.id,liveBId:opponentLiveId,scoreA:0,scoreB:0,durationSeconds:180,startsAt:null,endsAt:null});
      setPkOpen(false);
    }catch(e){setError(e instanceof Error?e.message:"Falha ao convidar para PK.");}
    finally{setBusy(false);}
  }

  async function battleAction(action:"accept"|"reject"|"end"){
    if(!battle)return;
    try{
      setBusy(true);setError("");
      await api("/api/v1/lives/battles/"+battle.id,{method:"PATCH",body:JSON.stringify({action})});
      await loadBattle();
    }catch(e){setError(e instanceof Error?e.message:"Falha ao atualizar batalha.");}
    finally{setBusy(false);}
  }

  async function openFanClub(){
    setFanOpen(true);setError("");
    try{
      const body=await api<{data:FanProduct[]}>("/api/v1/fans/products");
      setFanProducts(body.data);
    }catch(e){setError(e instanceof Error?e.message:"Falha ao carregar Fã-clube.");}
  }

  async function buyFan(productCode:string){
    if(!loggedIn){location.href="/login";return;}
    try{
      setBusy(true);setError("");
      await api("/api/v1/fans/purchase",{method:"POST",body:JSON.stringify({
        creatorUserId:live.hostId,productCode,idempotencyKey:crypto.randomUUID()+crypto.randomUUID()
      })});
      setFanOpen(false);setError("Fã-clube ativado.");
    }catch(e){setError(e instanceof Error?e.message:"Falha ao ativar Fã-clube.");}
    finally{setBusy(false);}
  }

  async function shareLive(){
    const url=location.origin+"/lives?live="+live.id;
    try{
      if(navigator.share)await navigator.share({title:live.title,text:"Assista esta live no Seven Chat",url});
      else{await navigator.clipboard.writeText(url);setError("Link da live copiado.");}
    }catch{}
  }

  async function endLive(){
    try{
      setBusy(true);setError("");
      await api("/api/v1/lives/"+live.id+"/end",{method:"POST"});
      onEnded();onClose();
    }catch(e){setError(e instanceof Error?e.message:"Falha ao encerrar live.");}
    finally{setBusy(false);}
  }

  const giftCatalog=wallet?.gifts?.length?wallet.gifts:gifts;
  const requestedGuests=hostGuests.filter(g=>g.status==="requested");
  const activeGuests=hostGuests.filter(g=>["accepted","invited"].includes(g.status));

  return <div className="seven-live-viewer">
    <div className="seven-live-stage">
      <RtcExperience key={live.id+"-"+canPublish+"-"+layout} resourceType="live" resourceId={live.id} mode="video" canPublishLocal={canPublish} liveLayout={layout}/>

      <div className="seven-live-top">
        <div className="seven-live-host">
          <div className="avatar sm">{live.hostDisplayName[0]?.toUpperCase()}</div>
          <div><strong>{live.hostDisplayName}</strong><span>@{live.hostUsername}</span></div>
          {!live.isHost&&loggedIn&&<FollowButton userId={live.hostId} initialFollowing={live.initialFollowing}/>}
        </div>
        <div className="seven-live-top-actions">
          <span className="live-chip">LIVE</span>
          <button className="seven-live-close" onClick={onClose} aria-label="Fechar live">×</button>
        </div>
      </div>

      {battle&&<div className={"seven-live-battlebar "+(battle.status==="active"?"is-active":"")}>
        {battle.status==="invited"?<>
          <strong>Convite de batalha</strong>
          {live.isHost&&battle.liveBId===live.id&&<div className="row"><button className="button compact" disabled={busy} onClick={()=>void battleAction("accept")}>Aceitar</button><button className="button secondary compact" disabled={busy} onClick={()=>void battleAction("reject")}>Recusar</button></div>}
        </>:<>
          <div className="battle-score-live"><b>{battle.scoreA.toLocaleString("pt-BR")}</b><span>VS · {battleClock}</span><b>{battle.scoreB.toLocaleString("pt-BR")}</b></div>
          <div className="battle-meter"><i style={{width:(battle.scoreA+battle.scoreB?battle.scoreA/(battle.scoreA+battle.scoreB)*100:50)+"%"}}/></div>
          {live.isHost&&<button className="battle-end" disabled={busy} onClick={()=>void battleAction("end")}>Encerrar</button>}
        </>}
      </div>}

      <div className="seven-live-title">
        <strong>{live.title}</strong>
        {live.category&&<span>{live.category}</span>}
      </div>

      {pinned&&<div className="seven-live-pinned"><span>📌</span><b>{pinned.displayName}</b><span>{pinned.body}</span></div>}

      <div className="seven-live-comments">
        {comments.filter(c=>!c.pinned).slice(-8).map(c=><div className="seven-live-comment" key={c.id}>
          <div><b>{c.displayName}</b> <span>{c.body}</span></div>
          {live.isHost&&<div className="live-comment-mod">
            <button onClick={()=>void moderate("pin_comment",c)} title="Fixar">📌</button>
            <button onClick={()=>void moderate("delete_comment",c)} title="Apagar">⌫</button>
            <button onClick={()=>void moderate("ban_user",c)} title="Bloquear da live">⊘</button>
          </div>}
        </div>)}
      </div>

      <div className="seven-live-rail">
        {!live.isHost&&<button onClick={()=>void openGifts()} title="Enviar gift">◇<small>Presentes</small></button>}
        {!live.isHost&&<button onClick={()=>void openFanClub()} title="Fã-clube">★<small>Fã</small></button>}
        {!live.isHost&&!canPublish&&guestStatus!=="requested"&&<button onClick={()=>void requestGuest()} title="Pedir para participar">＋<small>Participar</small></button>}
        {!live.isHost&&guestStatus==="requested"&&<button className="is-active" onClick={()=>void cancelGuestRequest()} title="Cancelar pedido">✓<small>Pedido</small></button>}
        {!live.isHost&&canPublish&&<button className="is-active" onClick={()=>void leaveStage()} title="Sair do palco">⇩<small>Sair</small></button>}
        {live.isHost&&<button onClick={()=>setGuestOpen(v=>!v)} title="Multi-convidados">＋<small>Convidados</small>{requestedGuests.length>0&&<i>{requestedGuests.length}</i>}</button>}
        {live.isHost&&!battle&&<button onClick={()=>setPkOpen(v=>!v)} title="Batalha">⚔<small>PK</small></button>}
        <button onClick={()=>void shareLive()} title="Compartilhar">↗<small>Compartilhar</small></button>
        {!live.isHost&&<button onClick={()=>setMoreOpen(true)} title="Mais opções">•••<small>Mais</small></button>}
      </div>

      <form className="seven-live-compose" onSubmit={sendComment}>
        <input value={comment} onChange={e=>setComment(e.target.value)} maxLength={500} placeholder={loggedIn?"Adicione um comentário...":"Entre para comentar"} disabled={!loggedIn||busy}/>
        <button disabled={!loggedIn||busy||!comment.trim()}>Enviar</button>
      </form>

      {error&&<div className="seven-live-error" onClick={()=>setError("")}>{error}</div>}

      {giftOpen&&<div className="seven-live-sheet seven-live-gift-sheet">
        <div className="row between">
          <div><span className="eyebrow">PRESENTES</span><h3>Enviar para {live.hostDisplayName}</h3></div>
          <button className="seven-live-close" onClick={()=>setGiftOpen(false)}>×</button>
        </div>
        {loggedIn&&<div className="live-wallet-balance"><span>Saldo</span><strong>◇ {(wallet?.balance??0).toLocaleString("pt-BR")}</strong><a href="/wallet">Recarregar</a></div>}
        <div className="seven-live-gifts">
          {giftCatalog.length?giftCatalog.map(g=><button key={g.id} disabled={!loggedIn||busy} onClick={()=>void sendGift(g.id)}>
            <span className="gift-icon">{g.assetUrl?<img src={g.assetUrl} alt=""/>:"◇"}</span><strong>{g.name}</strong><small>◇ {g.priceDiamonds}</small>
          </button>):<p className="muted">Nenhum presente ativo.</p>}
        </div>
      </div>}

      {fanOpen&&<div className="seven-live-sheet">
        <div className="row between"><div><span className="eyebrow">FÃ-CLUBE</span><h3>Apoie {live.hostDisplayName}</h3></div><button className="seven-live-close" onClick={()=>setFanOpen(false)}>×</button></div>
        <p className="muted">Entre para o Fã-clube usando diamantes e destaque seu apoio ao criador.</p>
        <div className="fan-live-products">{fanProducts.length?fanProducts.map(product=><button key={product.code} disabled={busy} onClick={()=>void buyFan(product.code)}>
          <div><strong>{product.tier}</strong><span>{product.durationDays} dias</span></div><b>◇ {product.priceDiamonds}</b>
        </button>):<span className="muted">Nenhum produto de fã ativo.</span>}</div>
      </div>}

      {guestOpen&&live.isHost&&<div className="seven-live-sheet seven-live-guest-sheet">
        <div className="row between"><div><span className="eyebrow">MULTI-CONVIDADOS</span><h3>Gerenciar palco</h3></div><button className="seven-live-close" onClick={()=>setGuestOpen(false)}>×</button></div>

        <div className="live-layout-switch">
          <button className={layout==="panel"?"active":""} onClick={()=>setLayout("panel")}>Painel</button>
          <button className={layout==="grid"?"active":""} onClick={()=>setLayout("grid")}>Grade</button>
        </div>

        {requestedGuests.length>0&&<div className="live-guest-section">
          <strong>Pedidos para participar</strong>
          {requestedGuests.map(v=><div className="live-guest-row" key={v.userId}>
            <div className="avatar sm">{v.displayName[0]?.toUpperCase()}</div>
            <div><b>{v.displayName}</b><span>@{v.username}</span></div>
            <div className="row"><button className="button compact" disabled={busy} onClick={()=>void hostGuestAction(v.userId,"accept")}>Aceitar</button><button className="button secondary compact" disabled={busy} onClick={()=>void hostGuestAction(v.userId,"reject")}>Recusar</button></div>
          </div>)}
        </div>}

        {activeGuests.length>0&&<div className="live-guest-section">
          <strong>No palco / convidados</strong>
          {activeGuests.map(v=><div className="live-guest-row" key={v.userId}>
            <div className="avatar sm">{v.displayName[0]?.toUpperCase()}</div>
            <div><b>{v.displayName}</b><span>{v.status==="accepted"?"No palco":"Convite enviado"}</span></div>
            <div className="row"><button className="button secondary compact" disabled={busy} onClick={()=>void setModerator(v.userId)}>Mod</button><button className="button secondary compact" disabled={busy} onClick={()=>void hostGuestAction(v.userId,"remove")}>Remover</button></div>
          </div>)}
        </div>}

        <div className="live-guest-section">
          <strong>Convidar alguém</strong>
          <div className="row"><input className="input" value={guestQuery} onChange={e=>setGuestQuery(e.target.value)} placeholder="Nome ou @usuário"/><button className="button compact" onClick={()=>void searchGuests()} disabled={busy||guestQuery.trim().length<2}>Buscar</button></div>
          <div className="seven-live-opponents">{guestResults.map(v=><button key={v.id} disabled={busy} onClick={()=>void inviteGuest(v.id)}><div className="avatar sm">{v.displayName[0]?.toUpperCase()}</div><div><strong>{v.displayName}</strong><small>@{v.username}</small></div><span>Convidar</span></button>)}</div>
        </div>
      </div>}

      {moreOpen&&!live.isHost&&<div className="seven-live-sheet seven-live-more-sheet">
        <div className="row between"><div><span className="eyebrow">SEGURANÇA</span><h3>Mais opções</h3></div><button className="seven-live-close" onClick={()=>setMoreOpen(false)}>×</button></div>
        <div className="live-more-actions">
          <button onClick={()=>void reportLive("spam")}>Denunciar spam</button>
          <button onClick={()=>void reportLive("harassment")}>Denunciar assédio</button>
          <button onClick={()=>void reportLive("sexual")}>Conteúdo sexual</button>
          <button onClick={()=>void reportLive("violence")}>Violência</button>
          <button onClick={()=>void reportLive("other")}>Outro motivo</button>
          <button className="danger" onClick={()=>void blockHost()}>Bloquear @{live.hostUsername}</button>
        </div>
      </div>}

      {pkOpen&&live.isHost&&!battle&&<div className="seven-live-sheet">
        <div className="row between"><div><span className="eyebrow">BATALHA / PK</span><h3>Encontre um adversário</h3></div><button className="seven-live-close" onClick={()=>setPkOpen(false)}>×</button></div>
        <p className="muted">O placar é alimentado pelos gifts enviados durante a batalha.</p>
        <div className="seven-live-opponents">
          {opponents.length?opponents.map(v=><button key={v.id} disabled={busy} onClick={()=>void startBattle(v.id)}><div className="avatar sm">{v.hostDisplayName[0]?.toUpperCase()}</div><div><strong>{v.hostDisplayName}</strong><small>{v.title}</small></div><span>Desafiar</span></button>):<p className="muted">Nenhuma outra live disponível para PK agora.</p>}
        </div>
      </div>}

      {live.isHost&&<div className="seven-live-hostbar">
        <span>Centro LIVE</span>
        <button className="hostbar-tool" onClick={()=>setGuestOpen(true)}>Convidados {requestedGuests.length?"("+requestedGuests.length+")":""}</button>
        <button className="hostbar-tool" onClick={()=>setLayout(v=>v==="panel"?"grid":"panel")}>Layout: {layout==="panel"?"Painel":"Grade"}</button>
        <button className="hostbar-end" onClick={()=>void endLive()} disabled={busy}>Encerrar</button>
      </div>}
    </div>
  </div>;
}
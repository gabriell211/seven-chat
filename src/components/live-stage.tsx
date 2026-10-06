"use client";

import { useCallback, useEffect, useState } from "react";\nimport type { FormEvent } from "react";
import { RtcExperience } from "@/components/rtc-experience";

export type LiveItem={
  id:string;
  title:string;
  category:string|null;
  viewerCount:number;
  peakViewers:number;
  hostId:string;
  hostUsername:string;
  hostDisplayName:string;
  hostAvatarUrl:string|null;
  isHost:boolean;
};

export type LiveGift={id:string;name:string;priceDiamonds:number;category:string;animationType:string};
export type LiveSuggestedUser={id:string;username:string;displayName:string;avatarUrl:string|null};

type Comment={
  id:string;body:string;pinned:boolean;createdAt:string;authorId:string;username:string;displayName:string;
};
type Guest={
  userId:string;role:string;status:string;joinedAt:string|null;username:string;displayName:string;avatarUrl:string|null;
};
type GuestState={guests:Guest[];me:Guest|null;isHost:boolean};
type BattleLive={id:string;hostId:string;title:string;username:string;displayName:string};
type Battle={
  id:string;liveAId:string;liveBId:string;status:string;durationSeconds:number;
  scoreA:number;scoreB:number;startsAt:string|null;endsAt:string|null;winnerLiveId:string|null;lives:BattleLive[];
};

async function api<T>(url:string,init:RequestInit={}):Promise<T>{
  const response=await fetch(url,{...init,headers:{"content-type":"application/json",...(init.headers??{})}});
  const body=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(body?.error?.message??"Não foi possível concluir a ação.");
  return body as T;
}

function avatarText(name:string){return name.trim().slice(0,1).toUpperCase()||"S";}

function remaining(endsAt:string|null){
  if(!endsAt)return "";
  const seconds=Math.max(0,Math.ceil((new Date(endsAt).getTime()-Date.now())/1000));
  const m=Math.floor(seconds/60),s=seconds%60;
  return `${m}:${String(s).padStart(2,"0")}`;
}

export function LiveStage({
  live,lives,gifts,suggestedUsers,currentUserId,onClose,onEnded
}:{
  live:LiveItem;
  lives:LiveItem[];
  gifts:LiveGift[];
  suggestedUsers:LiveSuggestedUser[];
  currentUserId:string;
  onClose:()=>void;
  onEnded:(id:string)=>void;
}){
  const [comments,setComments]=useState<Comment[]>([]);
  const [guestState,setGuestState]=useState<GuestState>({guests:[],me:null,isHost:live.isHost});
  const [battle,setBattle]=useState<Battle|null>(null);
  const [comment,setComment]=useState("");
  const [participantCount,setParticipantCount]=useState(Math.max(1,live.viewerCount));
  const [sheet,setSheet]=useState<"none"|"gifts"|"guests"|"battle"|"more">("none");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState("");
  const [followed,setFollowed]=useState(false);
  const [layout,setLayout]=useState<"grid"|"focus">("grid");
  const [battleClock,setBattleClock]=useState("");
  const canPublish=live.isHost||guestState.me?.status==="accepted";\n\n  useEffect(()=>{\n    const previous=document.body.style.overflow;\n    document.body.style.overflow="hidden";\n    return()=>{document.body.style.overflow=previous;};\n  },[]);

  const loadComments=useCallback(async()=>{
    const body=await api<{data<Comment[]>}>(`/api/v1/lives/${live.id}/comments`);
    setComments(body.data);
  },[live.id]);

  const loadGuests=useCallback(async()=>{
    const body=await api<{data:GuestState}>(`/api/v1/lives/${live.id}/guests`);
    setGuestState(body.data);
  },[live.id]);

  const loadBattle=useCallback(async()=>{
    const body=await api<{data:Battle|null}>(`/api/v1/lives/${live.id}/battles`);
    setBattle(body.data);
  },[live.id]);

  const refresh=useCallback(async()=>{
    await Promise.allSettled([loadComments(),loadGuests(),loadBattle()]);
  },[loadBattle,loadComments,loadGuests]);

  useEffect(()=>{
    void refresh();
    const timer=window.setInterval(()=>void refresh(),3500);
    return()=>window.clearInterval(timer);
  },[refresh]);

  useEffect(()=>{
    if(!battle?.endsAt){setBattleClock("");return;}
    const update=()=>setBattleClock(remaining(battle.endsAt));
    update();
    const timer=window.setInterval(update,1000);
    return()=>window.clearInterval(timer);
  },[battle?.endsAt]);

  useEffect(()=>{
    let socket:WebSocket|undefined;
    let closed=false;
    void (async()=>{
      try{
        const token=await api<{data:{token:string;url:string}}>("/api/v1/realtime/token",{method:"POST",body:"{}"});
        if(closed)return;
        socket=new WebSocket(token.data.url,["seven-chat",token.data.token]);
        socket.addEventListener("open",()=>socket?.send(JSON.stringify({type:"subscribe",channel:"live:"+live.id})));
        socket.addEventListener("message",event=>{
          try{
            const payload=JSON.parse(String(event.data)) as {channel?:string;event?:string};
            if(payload.channel!=="live:"+live.id)return;
            if(payload.event?.startsWith("live.comment"))void loadComments();
            if(payload.event?.startsWith("live.guest"))void loadGuests();
            if(payload.event?.startsWith("live.battle"))void loadBattle();
            if(payload.event==="live.ended"){onEnded(live.id);onClose();}
          }catch{}
        });
      }catch{}
    })();
    return()=>{closed=true;socket?.close();};
  },[live.id,loadBattle,loadComments,loadGuests,onClose,onEnded]);

  const submitComment=async(event:FormEvent)=>{
    event.preventDefault();
    const value=comment.trim();if(!value)return;
    try{
      setBusy("comment");setError("");
      await api(`/api/v1/lives/${live.id}/comments`,{method:"POST",body:JSON.stringify({body:value})});
      setComment("");await loadComments();
    }catch(e){setError(e instanceof Error?e.message:"Falha ao comentar.");}
    finally{setBusy("");}
  };

  const follow=async()=>{
    if(live.isHost)return;
    try{
      setBusy("follow");setError("");
      await api(`/api/v1/users/${live.hostId}/follow`,{method:"POST",body:"{}"});
      setFollowed(true);
    }catch(e){setError(e instanceof Error?e.message:"Falha ao seguir.");}
    finally{setBusy("");}
  };

  const share=async()=>{
    const url=window.location.origin+`/lives?live=${live.id}`;
    try{
      if(navigator.share)await navigator.share({title:live.title,text:"Assista esta LIVE no Seven Chat",url});
      else{await navigator.clipboard.writeText(url);setError("Link da LIVE copiado.");}
    }catch{}
  };

  const requestGuest=async()=>{
    try{
      setBusy("request");setError("");
      await api(`/api/v1/lives/${live.id}/guests`,{method:"POST",body:JSON.stringify({action:"request"})});
      await loadGuests();
    }catch(e){setError(e instanceof Error?e.message:"Não foi possível pedir participação.");}
    finally{setBusy("");}
  };

  const guestAction=async(action:"accept"|"reject"|"leave")=>{
    try{
      setBusy("guest");setError("");
      await api(`/api/v1/lives/${live.id}/guests/me`,{method:"PATCH",body:JSON.stringify({action})});
      await loadGuests();
    }catch(e){setError(e instanceof Error?e.message:"Ação de convidado falhou.");}
    finally{setBusy("");}
  };

  const hostGuestAction=async(userId:string,action:"accept"|"remove")=>{
    try{
      setBusy("host-guest");setError("");
      await api(`/api/v1/lives/${live.id}/guests/${userId}`,{method:action==="accept"?"PUT":"DELETE",body:"{}"});
      await loadGuests();
    }catch(e){setError(e instanceof Error?e.message:"Não foi possível atualizar o convidado.");}
    finally{setBusy("");}
  };

  const inviteUser=async(userId:string)=>{
    try{
      setBusy("invite");setError("");
      await api(`/api/v1/lives/${live.id}/guests`,{method:"POST",body:JSON.stringify({userId})});
      await loadGuests();
    }catch(e){setError(e instanceof Error?e.message:"Não foi possível convidar.");}
    finally{setBusy("");}
  };

  const moderate=async(action:"pin_comment"|"delete_comment"|"ban_user",comment:Comment)=>{
    try{
      setBusy("moderate");setError("");
      const payload=action==="ban_user"?{action,userId:comment.authorId,reason:"Moderação da LIVE"}:{action,commentId:comment.id};
      await api(`/api/v1/lives/${live.id}/moderation`,{method:"POST",body:JSON.stringify(payload)});
      await loadComments();
    }catch(e){setError(e instanceof Error?e.message:"Falha na moderação.");}
    finally{setBusy("");}
  };

  const sendGift=async(gift:LiveGift)=>{
    if(live.isHost)return;
    try{
      setBusy("gift:"+gift.id);setError("");
      await api("/api/v1/gifts/send",{method:"POST",body:JSON.stringify({
        giftId:gift.id,quantity:1,idempotencyKey:crypto.randomUUID(),contextType:"live",liveId:live.id
      })});
      setSheet("none");
      await loadBattle();
    }catch(e){setError(e instanceof Error?e.message:"Não foi possível enviar o presente.");}
    finally{setBusy("");}
  };

  const startBattle=async(opponentLiveId:string)=>{
    try{
      setBusy("battle");setError("");
      await api(`/api/v1/lives/${live.id}/battles`,{method:"POST",body:JSON.stringify({opponentLiveId,durationSeconds:180})});
      await loadBattle();
    }catch(e){setError(e instanceof Error?e.message:"Não foi possível convidar para batalha.");}
    finally{setBusy("");}
  };

  const battleAction=async(action:"accept"|"reject"|"end")=>{
    if(!battle)return;
    try{
      setBusy("battle-action");setError("");
      await api(`/api/v1/lives/battles/${battle.id}`,{method:"PATCH",body:JSON.stringify({action})});
      await loadBattle();
    }catch(e){setError(e instanceof Error?e.message:"Não foi possível atualizar a batalha.");}
    finally{setBusy("");}
  };

  const endLive=async()=>{
    if(!live.isHost)return;
    if(!window.confirm("Encerrar esta LIVE agora?"))return;
    try{
      setBusy("end");setError("");
      await api(`/api/v1/lives/${live.id}/end`,{method:"POST",body:"{}"});
      onEnded(live.id);onClose();
    }catch(e){setError(e instanceof Error?e.message:"Não foi possível encerrar a LIVE.");}
    finally{setBusy("");}
  };

  const activeGuests=guestState.guests.filter(g=>g.status==="accepted");
  const requests=guestState.guests.filter(g=>g.status==="requested");
  const invited=guestState.guests.filter(g=>g.status==="invited");
  const otherLives=lives.filter(v=>v.id!==live.id);
  const battleSide=battle?.liveAId===live.id?"A":"B";
  const opponent=battle?.lives.find(v=>v.id!==(battleSide==="A"?battle.liveAId:battle.liveBId));
  const pinned=comments.find(v=>v.pinned);
  const visibleComments=comments.slice(-9);

  return <div className="live-room">
    <div className="live-media">
      <RtcExperience
        key={canPublish?"publisher":"viewer"}
        resourceType="live"
        resourceId={live.id}
        mode="video"
        canPublishLocal={canPublish}
        variant="live"
        layout={layout}
        onParticipantCount={setParticipantCount}
      />
    </div>
    <div className="live-shade"/>

    <header className="live-room-top">
      <div className="live-host-card">
        <div className="live-avatar">{avatarText(live.hostDisplayName)}</div>
        <div className="live-host-copy">
          <strong>{live.hostDisplayName}</strong>
          <span>@{live.hostUsername}</span>
        </div>
        {!live.isHost&&<button className={"live-follow "+(followed?"is-following":"")} onClick={()=>void follow()} disabled={busy==="follow"}>{followed?"Seguindo":"Seguir"}</button>}
      </div>
      <div className="live-top-badges">
        <span className="live-badge">AO VIVO</span>
        <span className="live-viewers">◉ {participantCount}</span>
        <button className="live-close" onClick={onClose} aria-label="Fechar LIVE">×</button>
      </div>
    </header>

    {battle&&<div className={"live-battle-strip "+(battle.status==="active"?"is-active":"")}>
      <div><strong>{battleSide==="A"?battle.scoreA:battle.scoreB}</strong><span>Seven</span></div>
      <div className="live-battle-center">
        <span>{battle.status==="active"?"BATALHA":"CONVITE DE BATALHA"}</span>
        <b>{battle.status==="active"?(battleClock||"0:00"):"VS"}</b>
      </div>
      <div><strong>{battleSide==="A"?battle.scoreB:battle.scoreA}</strong><span>{opponent?.displayName??"Adversário"}</span></div>
      {live.isHost&&battle.status==="invited"&&battle.liveBId===live.id&&<div className="live-battle-invite-actions"><button onClick={()=>void battleAction("accept")}>Aceitar</button><button onClick={()=>void battleAction("reject")}>Recusar</button></div>}
    </div>}

    {pinned&&<div className="live-pinned"><span>📌</span><strong>{pinned.displayName}</strong><p>{pinned.body}</p></div>}

    <div className="live-room-info">
      <span className="live-room-title">{live.title}</span>
      {live.category&&<span className="live-room-category">{live.category}</span>}
      {activeGuests.length>0&&<span className="live-room-category">+{activeGuests.length} convidado{activeGuests.length>1?"s":""}</span>}
    </div>

    <div className="live-comments" aria-live="polite">
      {visibleComments.map(item=><div className={"live-comment "+(item.pinned?"is-pinned":"")} key={item.id}>
        <div><strong>{item.displayName}</strong><span>@{item.username}</span></div>
        <p>{item.body}</p>
        {live.isHost&&item.authorId!==currentUserId&&<div className="live-comment-mod">
          <button onClick={()=>void moderate("pin_comment",item)}>Fixar</button>
          <button onClick={()=>void moderate("delete_comment",item)}>Excluir</button>
          <button onClick={()=>void moderate("ban_user",item)}>Banir</button>
        </div>}
      </div>)}
      {!comments.length&&<div className="live-system-message">Seja a primeira pessoa a comentar.</div>}
    </div>

    <aside className="live-actions">
      {!live.isHost&&<button onClick={()=>setSheet("gifts")}><span>🎁</span><small>Presente</small></button>}
      <button onClick={()=>setSheet("guests")}><span>👥</span><small>{live.isHost?"Convidar":"Participar"}</small></button>
      {live.isHost&&<button onClick={()=>setSheet("battle")}><span>⚔</span><small>Batalha</small></button>}
      <button onClick={()=>void share()}><span>↗</span><small>Compartilhar</small></button>
      <button onClick={()=>setSheet("more")}><span>•••</span><small>Mais</small></button>
    </aside>

    {guestState.me?.status==="invited"&&<div className="live-invite-banner">
      <div><strong>Convite para participar</strong><span>O host convidou você para entrar com câmera e microfone.</span></div>
      <button onClick={()=>void guestAction("accept")}>Aceitar</button>
      <button className="secondary" onClick={()=>void guestAction("reject")}>Recusar</button>
    </div>}

    {error&&<div className="live-toast">{error}</div>}

    <form className="live-composer" onSubmit={submitComment}>
      <input value={comment} onChange={e=>setComment(e.target.value)} maxLength={500} placeholder="Adicione um comentário..." aria-label="Comentário"/>
      <button type="submit" disabled={!comment.trim()||busy==="comment"}>Enviar</button>
    </form>

    {sheet!=="none"&&<div className="live-sheet-backdrop" onClick={()=>setSheet("none")}>
      <section className="live-sheet" onClick={e=>e.stopPropagation()}>
        <div className="live-sheet-head"><div><span className="eyebrow">SEVEN LIVE</span><h3>{
          sheet==="gifts"?"Presentes":sheet==="guests"?(live.isHost?"Convidados":"Participar da LIVE"):sheet==="battle"?"Batalha":"Controles"
        }</h3></div><button onClick={()=>setSheet("none")}>×</button></div>

        {sheet==="gifts"&&<div className="live-gift-grid">
          {gifts.length?gifts.map(gift=><button key={gift.id} onClick={()=>void sendGift(gift)} disabled={busy==="gift:"+gift.id}>
            <span className="live-gift-emoji">{gift.animationType==="3d"?"✦":"◇"}</span>
            <strong>{gift.name}</strong>
            <small>◇ {gift.priceDiamonds}</small>
          </button>):<p className="muted">Nenhum presente ativo.</p>}
        </div>}

        {sheet==="guests"&&!live.isHost&&<div className="stack">
          <div className="live-sheet-card"><strong>Entrar como convidado</strong><p>Se o host aceitar, você poderá publicar câmera e microfone nesta LIVE.</p></div>
          {guestState.me?.status==="accepted"?<button className="button secondary full" onClick={()=>void guestAction("leave")}>Sair do palco</button>
          :guestState.me?.status==="requested"?<button className="button secondary full" disabled>Pedido enviado</button>
          :guestState.me?.status==="invited"?<><button className="button full" onClick={()=>void guestAction("accept")}>Aceitar convite</button><button className="button secondary full" onClick={()=>void guestAction("reject")}>Recusar</button></>
          :<button className="button full" onClick={()=>void requestGuest()} disabled={busy==="request"}>Pedir para participar</button>}
        </div>}

        {sheet==="guests"&&live.isHost&&<div className="stack">
          {requests.length>0&&<div><h4>Pedidos para entrar</h4><div className="live-people-list">{requests.map(person=><div key={person.userId}><span className="live-mini-avatar">{avatarText(person.displayName)}</span><div><strong>{person.displayName}</strong><small>@{person.username}</small></div><button onClick={()=>void hostGuestAction(person.userId,"accept")}>Aceitar</button></div>)}</div></div>}
          {(activeGuests.length>0||invited.length>0)&&<div><h4>No palco / convidados</h4><div className="live-people-list">{[...activeGuests,...invited].map(person=><div key={person.userId}><span className="live-mini-avatar">{avatarText(person.displayName)}</span><div><strong>{person.displayName}</strong><small>{person.status==="accepted"?"No palco":"Convite enviado"}</small></div><button className="danger" onClick={()=>void hostGuestAction(person.userId,"remove")}>Remover</button></div>)}</div></div>}
          <div><h4>Convidar pessoas</h4><div className="live-people-list">{suggestedUsers.filter(u=>u.id!==currentUserId&&!guestState.guests.some(g=>g.userId===u.id&&["accepted","invited"].includes(g.status))).slice(0,12).map(person=><div key={person.id}><span className="live-mini-avatar">{avatarText(person.displayName)}</span><div><strong>{person.displayName}</strong><small>@{person.username}</small></div><button onClick={()=>void inviteUser(person.id)}>Convidar</button></div>)}</div></div>
          <div className="row between"><span>Layout dos participantes</span><div className="live-segmented"><button className={layout==="grid"?"active":""} onClick={()=>setLayout("grid")}>Grade</button><button className={layout==="focus"?"active":""} onClick={()=>setLayout("focus")}>Painel</button></div></div>
        </div>}

        {sheet==="battle"&&live.isHost&&<div className="stack">
          {battle?.status==="active"?<>
            <div className="live-sheet-card"><strong>Batalha em andamento</strong><p>Presentes enviados para cada LIVE alimentam o placar em tempo real.</p></div>
            <button className="button secondary full" onClick={()=>void battleAction("end")}>Encerrar batalha</button>
          </>:battle?.status==="invited"?<div className="live-sheet-card"><strong>Convite de batalha pendente</strong><p>Aguardando resposta da outra LIVE.</p></div>:<>
            <div className="live-sheet-card"><strong>Escolha uma LIVE</strong><p>Convide outro host ao vivo para uma batalha de 3 minutos.</p></div>
            <div className="live-people-list">{otherLives.map(item=><div key={item.id}><span className="live-mini-avatar">{avatarText(item.hostDisplayName)}</span><div><strong>{item.hostDisplayName}</strong><small>{item.title}</small></div><button onClick={()=>void startBattle(item.id)}>Desafiar</button></div>)}</div>
          </>}
        </div>}

        {sheet==="more"&&<div className="stack">
          {live.isHost&&<>
            <div className="row between"><span>Layout da LIVE</span><div className="live-segmented"><button className={layout==="grid"?"active":""} onClick={()=>setLayout("grid")}>Grade</button><button className={layout==="focus"?"active":""} onClick={()=>setLayout("focus")}>Painel</button></div></div>
            <button className="button secondary full" onClick={()=>setSheet("guests")}>Gerenciar convidados</button>
            <button className="button secondary full" onClick={()=>setSheet("battle")}>Abrir batalha</button>
            <button className="button live-end full" onClick={()=>void endLive()} disabled={busy==="end"}>Encerrar LIVE</button>
          </>}
          {!live.isHost&&<button className="button secondary full" onClick={onClose}>Sair da LIVE</button>}
        </div>}
      </section>
    </div>}
  </div>;
}

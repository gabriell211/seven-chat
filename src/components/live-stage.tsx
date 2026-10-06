"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
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
  isFollowing:boolean;
};

export type LiveGift={
  id:string;
  name:string;
  priceDiamonds:number;
  category:string;
  animationType:string;
};

export type LiveSuggestedUser={
  id:string;
  username:string;
  displayName:string;
  avatarUrl:string|null;
};

export type LiveFanProduct={
  code:string;
  tier:string;
  durationDays:number;
  priceDiamonds:number;
};

type Comment={
  id:string;
  body:string;
  pinned:boolean;
  createdAt:string;
  authorId:string;
  username:string;
  displayName:string;
  isMegaFan:boolean;
};

type RankingEntry={
  position:number;
  userId:string;
  username:string;
  displayName:string;
  giftQuantity:number;
  diamonds:number;
  transactions:number;
};

type Guest={
  userId:string;
  role:string;
  status:string;
  joinedAt:string|null;
  username:string;
  displayName:string;
  avatarUrl:string|null;
};

type GuestState={
  guests:Guest[];
  me:Guest|null;
  isHost:boolean;
};

type Moderator={
  userId:string;
  username:string;
  displayName:string;
  avatarUrl:string|null;
};

type ModeratorState={
  moderators:Moderator[];
  isHost:boolean;
  isModerator:boolean;
};

type BattleLive={
  id:string;
  hostId:string;
  title:string;
  username:string;
  displayName:string;
};

type Battle={
  id:string;
  liveAId:string;
  liveBId:string;
  status:string;
  durationSeconds:number;
  scoreA:number;
  scoreB:number;
  startsAt:string|null;
  endsAt:string|null;
  winnerLiveId:string|null;
  lives:BattleLive[];
};

type Sheet="none"|"gifts"|"guests"|"battle"|"fans"|"ranking"|"moderators"|"more";

type LiveSummary={
  id:string;
  title:string;
  category:string|null;
  durationSeconds:number;
  peakViewers:number;
  viewerCount:number;
  comments:number;
  giftTransactions:number;
  giftQuantity:number;
  diamonds:number;
  newFollowers:number;
};

async function api<T>(url:string,init:RequestInit={}):Promise<T>{
  const response=await fetch(url,{
    ...init,
    headers:{"content-type":"application/json",...(init.headers??{})}
  });
  const body=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(body?.error?.message??"Não foi possível concluir a ação.");
  return body as T;
}

function avatarText(name:string){
  return name.trim().slice(0,1).toUpperCase()||"S";
}

function remaining(endsAt:string|null){
  if(!endsAt)return "";
  const seconds=Math.max(0,Math.ceil((new Date(endsAt).getTime()-Date.now())/1000));
  const minutes=Math.floor(seconds/60);
  return `${minutes}:${String(seconds%60).padStart(2,"0")}`;
}

export function LiveStage({
  live,lives,gifts,fanProducts,suggestedUsers,currentUserId,onClose,onEnded
}:{
  live:LiveItem;
  lives:LiveItem[];
  gifts:LiveGift[];
  fanProducts:LiveFanProduct[];
  suggestedUsers:LiveSuggestedUser[];
  currentUserId:string;
  onClose:()=>void;
  onEnded:(id:string)=>void;
}){
  const [comments,setComments]=useState<Comment[]>([]);
  const [guestState,setGuestState]=useState<GuestState>({guests:[],me:null,isHost:live.isHost});
  const [moderatorState,setModeratorState]=useState<ModeratorState>({moderators:[],isHost:live.isHost,isModerator:false});
  const [battle,setBattle]=useState<Battle|null>(null);
  const [ranking,setRanking]=useState<RankingEntry[]>([]);
  const [comment,setComment]=useState("");
  const [participantCount,setParticipantCount]=useState(Math.max(1,live.viewerCount));
  const [sheet,setSheet]=useState<Sheet>("none");
  const [message,setMessage]=useState<{kind:"error"|"success";text:string}|null>(null);
  const [busy,setBusy]=useState("");
  const [followed,setFollowed]=useState(live.isFollowing);
  const [fanJoined,setFanJoined]=useState(false);
  const [layout,setLayout]=useState<"grid"|"focus">("grid");
  const [battleClock,setBattleClock]=useState("");
  const [summary,setSummary]=useState<LiveSummary|null>(null);
  const [fanSpotlight,setFanSpotlight]=useState("");

  const canPublish=live.isHost||guestState.me?.status==="accepted";
  const canModerate=live.isHost||moderatorState.isModerator;

  useEffect(()=>{
    const previous=document.body.style.overflow;
    document.body.style.overflow="hidden";
    return()=>{document.body.style.overflow=previous;};
  },[]);

  const loadComments=useCallback(async()=>{
    const body=await api<{data:Comment[]}>(`/api/v1/lives/${live.id}/comments`);
    setComments(body.data);
  },[live.id]);

  const loadGuests=useCallback(async()=>{
    const body=await api<{data:GuestState}>(`/api/v1/lives/${live.id}/guests`);
    setGuestState(body.data);
  },[live.id]);

  const loadModerators=useCallback(async()=>{
    const body=await api<{data:ModeratorState}>(`/api/v1/lives/${live.id}/moderators`);
    setModeratorState(body.data);
  },[live.id]);

  const loadBattle=useCallback(async()=>{
    const body=await api<{data:Battle|null}>(`/api/v1/lives/${live.id}/battles`);
    setBattle(body.data);
  },[live.id]);

  const loadRanking=useCallback(async()=>{
    const body=await api<{data:RankingEntry[]}>(`/api/v1/lives/${live.id}/ranking`);
    setRanking(body.data);
  },[live.id]);

  const loadSummary=useCallback(async()=>{
    const body=await api<{data:LiveSummary}>(`/api/v1/lives/${live.id}/summary`);
    setSummary(body.data);
  },[live.id]);

  const refresh=useCallback(async()=>{
    await Promise.allSettled([loadComments(),loadGuests(),loadModerators(),loadBattle(),loadRanking()]);
  },[loadBattle,loadComments,loadGuests,loadModerators,loadRanking]);

  useEffect(()=>{
    void refresh();
    const timer=window.setInterval(()=>void refresh(),3500);
    return()=>window.clearInterval(timer);
  },[refresh]);

  useEffect(()=>{
    if(live.isHost)return;
    let active=true;
    void (async()=>{
      try{
        const status=await api<{data:{active:boolean}}>(`/api/v1/fans/status?creatorUserId=${live.hostId}`);
        if(!active||!status.data.active)return;
        setFanJoined(true);
        await api(`/api/v1/lives/${live.id}/fan-entry`,{method:"POST",body:"{}"}).catch(()=>null);
      }catch{}
    })();
    return()=>{active=false;};
  },[live.hostId,live.id,live.isHost]);

  useEffect(()=>{
    if(!battle?.endsAt){
      setBattleClock("");
      return;
    }
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
        socket.addEventListener("open",()=>{
          socket?.send(JSON.stringify({type:"subscribe",channel:"live:"+live.id}));
        });
        socket.addEventListener("message",event=>{
          try{
            const payload=JSON.parse(String(event.data)) as {channel?:string;event?:string;data?:{displayName?:string}};
            if(payload.channel!=="live:"+live.id)return;
            if(payload.event?.startsWith("live.comment"))void loadComments();
            if(payload.event?.startsWith("live.guest"))void loadGuests();
            if(payload.event?.startsWith("live.battle"))void loadBattle();
            if(payload.event==="live.gift.received")void loadRanking();
            if(payload.event?.startsWith("live.moderation"))void loadComments();
            if(payload.event==="live.fan.joined"&&payload.data?.displayName){
              setFanSpotlight(payload.data.displayName);
              window.setTimeout(()=>setFanSpotlight(""),3200);
            }
            if(payload.event==="live.ended"){
              if(live.isHost)void loadSummary();
              else{
                onEnded(live.id);
                onClose();
              }
            }
          }catch{}
        });
      }catch{}
    })();

    return()=>{
      closed=true;
      socket?.close();
    };
  },[live.id,live.isHost,loadBattle,loadComments,loadGuests,loadRanking,loadSummary,onClose,onEnded]);

  const flash=(kind:"error"|"success",text:string)=>{
    setMessage({kind,text});
    window.setTimeout(()=>setMessage(null),3200);
  };

  const submitComment=async(event:FormEvent)=>{
    event.preventDefault();
    const value=comment.trim();
    if(!value)return;

    try{
      setBusy("comment");
      await api(`/api/v1/lives/${live.id}/comments`,{
        method:"POST",
        body:JSON.stringify({body:value})
      });
      setComment("");
      await loadComments();
    }catch(e){
      flash("error",e instanceof Error?e.message:"Falha ao comentar.");
    }finally{
      setBusy("");
    }
  };

  const follow=async()=>{
    if(live.isHost)return;

    try{
      setBusy("follow");
      await api(`/api/v1/users/${live.hostId}/follow`,{method:"POST",body:"{}"});
      setFollowed(true);
      flash("success","Você agora segue este criador.");
    }catch(e){
      flash("error",e instanceof Error?e.message:"Falha ao seguir.");
    }finally{
      setBusy("");
    }
  };

  const blockHost=async()=>{
    if(live.isHost)return;
    if(!window.confirm(`Bloquear ${live.hostDisplayName}? Você deixará de seguir o perfil e esta LIVE será fechada.`))return;
    try{
      setBusy("block");
      await api(`/api/v1/users/${live.hostId}/block`,{method:"POST",body:"{}"});
      onEnded(live.id);
      onClose();
    }catch(e){
      flash("error",e instanceof Error?e.message:"Não foi possível bloquear este criador.");
    }finally{
      setBusy("");
    }
  };

  const share=async()=>{
    const url=window.location.origin+`/lives?live=${live.id}`;

    try{
      if(navigator.share){
        await navigator.share({title:live.title,text:"Assista esta LIVE no Seven Chat",url});
      }else{
        await navigator.clipboard.writeText(url);
        flash("success","Link da LIVE copiado.");
      }
    }catch{}
  };

  const requestGuest=async()=>{
    try{
      setBusy("request");
      await api(`/api/v1/lives/${live.id}/guests`,{
        method:"POST",
        body:JSON.stringify({action:"request"})
      });
      await loadGuests();
      flash("success","Pedido enviado ao host.");
    }catch(e){
      flash("error",e instanceof Error?e.message:"Não foi possível pedir participação.");
    }finally{
      setBusy("");
    }
  };

  const guestAction=async(action:"accept"|"reject"|"leave")=>{
    try{
      setBusy("guest");
      await api(`/api/v1/lives/${live.id}/guests/me`,{
        method:"PATCH",
        body:JSON.stringify({action})
      });
      await loadGuests();
      if(action==="accept")flash("success","Convite aceito. Você pode ativar câmera e microfone.");
    }catch(e){
      flash("error",e instanceof Error?e.message:"Ação de convidado falhou.");
    }finally{
      setBusy("");
    }
  };

  const hostGuestAction=async(userId:string,action:"accept"|"remove")=>{
    try{
      setBusy("host-guest");
      await api(`/api/v1/lives/${live.id}/guests/${userId}`,{
        method:action==="accept"?"PUT":"DELETE",
        body:"{}"
      });
      await loadGuests();
    }catch(e){
      flash("error",e instanceof Error?e.message:"Não foi possível atualizar o convidado.");
    }finally{
      setBusy("");
    }
  };

  const inviteUser=async(userId:string)=>{
    try{
      setBusy("invite");
      await api(`/api/v1/lives/${live.id}/guests`,{
        method:"POST",
        body:JSON.stringify({userId})
      });
      await loadGuests();
      flash("success","Convite enviado.");
    }catch(e){
      flash("error",e instanceof Error?e.message:"Não foi possível convidar.");
    }finally{
      setBusy("");
    }
  };

  const manageModerator=async(userId:string,enabled:boolean)=>{
    try{
      setBusy("moderator");
      await api(`/api/v1/lives/${live.id}/moderators/${userId}`,{
        method:enabled?"PUT":"DELETE",
        body:"{}"
      });
      await loadModerators();
      flash("success",enabled?"Moderador adicionado.":"Moderador removido.");
    }catch(e){
      flash("error",e instanceof Error?e.message:"Não foi possível atualizar moderadores.");
    }finally{
      setBusy("");
    }
  };

  const moderate=async(action:"pin_comment"|"delete_comment"|"ban_user",item:Comment)=>{
    try{
      setBusy("moderate");
      const payload=action==="ban_user"
        ?{action,userId:item.authorId,reason:"Moderação da LIVE"}
        :{action,commentId:item.id};

      await api(`/api/v1/lives/${live.id}/moderation`,{
        method:"POST",
        body:JSON.stringify(payload)
      });
      await loadComments();
    }catch(e){
      flash("error",e instanceof Error?e.message:"Falha na moderação.");
    }finally{
      setBusy("");
    }
  };

  const sendGift=async(gift:LiveGift)=>{
    if(live.isHost)return;

    try{
      setBusy("gift:"+gift.id);
      await api("/api/v1/gifts/send",{
        method:"POST",
        body:JSON.stringify({
          giftId:gift.id,
          quantity:1,
          idempotencyKey:crypto.randomUUID(),
          contextType:"live",
          liveId:live.id
        })
      });
      setSheet("none");
      await Promise.allSettled([loadBattle(),loadRanking()]);
      flash("success",`${gift.name} enviado.`);
    }catch(e){
      flash("error",e instanceof Error?e.message:"Não foi possível enviar o presente.");
    }finally{
      setBusy("");
    }
  };

  const buyFan=async(product:LiveFanProduct)=>{
    if(live.isHost)return;

    try{
      setBusy("fan:"+product.code);
      await api("/api/v1/fans/purchase",{
        method:"POST",
        body:JSON.stringify({
          creatorUserId:live.hostId,
          productCode:product.code,
          idempotencyKey:crypto.randomUUID()
        })
      });
      setFanJoined(true);
      setSheet("none");
      await api(`/api/v1/lives/${live.id}/fan-entry`,{method:"POST",body:"{}"}).catch(()=>null);
      flash("success",`Mega Fã ativado por ${product.durationDays} dias.`);
    }catch(e){
      flash("error",e instanceof Error?e.message:"Não foi possível ativar Mega Fã.");
    }finally{
      setBusy("");
    }
  };

  const startBattle=async(opponentLiveId:string)=>{
    try{
      setBusy("battle");
      await api(`/api/v1/lives/${live.id}/battles`,{
        method:"POST",
        body:JSON.stringify({opponentLiveId,durationSeconds:180})
      });
      await loadBattle();
      flash("success","Convite de batalha enviado.");
    }catch(e){
      flash("error",e instanceof Error?e.message:"Não foi possível convidar para batalha.");
    }finally{
      setBusy("");
    }
  };

  const battleAction=async(action:"accept"|"reject"|"end")=>{
    if(!battle)return;

    try{
      setBusy("battle-action");
      await api(`/api/v1/lives/battles/${battle.id}`,{
        method:"PATCH",
        body:JSON.stringify({action})
      });
      await loadBattle();
    }catch(e){
      flash("error",e instanceof Error?e.message:"Não foi possível atualizar a batalha.");
    }finally{
      setBusy("");
    }
  };

  const endLive=async()=>{
    if(!live.isHost)return;
    if(!window.confirm("Encerrar esta LIVE agora?"))return;

    try{
      setBusy("end");
      await api(`/api/v1/lives/${live.id}/end`,{method:"POST",body:"{}"});
      await loadSummary();
    }catch(e){
      flash("error",e instanceof Error?e.message:"Não foi possível encerrar a LIVE.");
    }finally{
      setBusy("");
    }
  };

  const activeGuests=guestState.guests.filter(g=>g.status==="accepted");
  const requests=guestState.guests.filter(g=>g.status==="requested");
  const invited=guestState.guests.filter(g=>g.status==="invited");
  const otherLives=lives.filter(v=>v.id!==live.id);
  const battleSide=battle?.liveAId===live.id?"A":"B";
  const opponent=battle?.lives.find(v=>v.id!==(battleSide==="A"?battle.liveAId:battle.liveBId));
  const pinned=comments.find(v=>v.pinned);
  const visibleComments=comments.slice(-9);
  const summaryDuration=summary
    ?`${Math.floor(summary.durationSeconds/3600).toString().padStart(2,"0")}:${Math.floor((summary.durationSeconds%3600)/60).toString().padStart(2,"0")}:${(summary.durationSeconds%60).toString().padStart(2,"0")}`
    :"00:00:00";

  return <div className="live-room">
    <div className={"live-media "+(battle?.status==="active"&&opponent?"is-battle":"")}>
      <div className="live-battle-media-side live-battle-own">
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
        {battle?.status==="active"&&opponent&&<div className="live-battle-media-label">{live.hostDisplayName}</div>}
      </div>
      {battle?.status==="active"&&opponent&&<div className="live-battle-media-side live-battle-opponent">
        <RtcExperience
          key={"battle-opponent-"+opponent.id}
          resourceType="live"
          resourceId={opponent.id}
          mode="video"
          canPublishLocal={false}
          variant="live"
          layout="focus"
        />
        <div className="live-battle-media-label">{opponent.displayName}</div>
      </div>}
    </div>

    <div className="live-shade"/>

    <header className="live-room-top">
      <div className="live-host-card">
        <div className="live-avatar">{avatarText(live.hostDisplayName)}</div>
        <div className="live-host-copy">
          <strong>{live.hostDisplayName}</strong>
          <span>@{live.hostUsername}</span>
        </div>
        {!live.isHost&&<button
          className={"live-follow "+(followed?"is-following":"")}
          onClick={()=>void follow()}
          disabled={busy==="follow"}
        >{followed?"Seguindo":"Seguir"}</button>}
        {!live.isHost&&fanJoined&&<span className="live-fan-tag">MEGA FÃ</span>}
      </div>

      <div className="live-top-badges">
        <span className="live-badge">AO VIVO</span>
        <span className="live-viewers">◉ {participantCount}</span>
        <button className="live-close" onClick={onClose} aria-label="Fechar LIVE">×</button>
      </div>
    </header>

    {battle&&<div className={"live-battle-strip "+(battle.status==="active"?"is-active":"")}>
      <div>
        <strong>{battleSide==="A"?battle.scoreA:battle.scoreB}</strong>
        <span>{live.hostDisplayName}</span>
      </div>
      <div className="live-battle-center">
        <span>{battle.status==="active"?"BATALHA":"CONVITE DE BATALHA"}</span>
        <b>{battle.status==="active"?(battleClock||"0:00"):"VS"}</b>
      </div>
      <div>
        <strong>{battleSide==="A"?battle.scoreB:battle.scoreA}</strong>
        <span>{opponent?.displayName??"Adversário"}</span>
      </div>
      {live.isHost&&battle.status==="invited"&&battle.liveBId===live.id&&<div className="live-battle-invite-actions">
        <button onClick={()=>void battleAction("accept")}>Aceitar</button>
        <button onClick={()=>void battleAction("reject")}>Recusar</button>
      </div>}
    </div>}

    {pinned&&<div className="live-pinned">
      <span>📌</span>
      <strong>{pinned.displayName}</strong>
      <p>{pinned.body}</p>
    </div>}

    <div className="live-room-info">
      <span className="live-room-title">{live.title}</span>
      {live.category&&<span className="live-room-category">{live.category}</span>}
      {activeGuests.length>0&&<span className="live-room-category">
        +{activeGuests.length} convidado{activeGuests.length>1?"s":""}
      </span>}
      {canModerate&&!live.isHost&&<span className="live-room-category">Moderador</span>}
    </div>

    <div className="live-comments" aria-live="polite">
      {visibleComments.map(item=><div className={"live-comment "+(item.pinned?"is-pinned":"")} key={item.id}>
        <div>
          <strong>{item.displayName}</strong>
          <span>@{item.username}</span>
        </div>
        <p>{item.body}</p>
        {item.isMegaFan&&<span className="live-comment-fan">★ Mega Fã</span>}
        {canModerate&&item.authorId!==currentUserId&&<div className="live-comment-mod">
          <button onClick={()=>void moderate("pin_comment",item)}>Fixar</button>
          <button onClick={()=>void moderate("delete_comment",item)}>Excluir</button>
          <button onClick={()=>void moderate("ban_user",item)}>Banir</button>
        </div>}
      </div>)}
      {!comments.length&&<div className="live-system-message">Seja a primeira pessoa a comentar.</div>}
    </div>

    <aside className="live-actions">
      {!live.isHost&&<button onClick={()=>setSheet("gifts")}>
        <span>🎁</span><small>Presente</small>
      </button>}
      {!live.isHost&&fanProducts.length>0&&<button onClick={()=>setSheet("fans")}>
        <span>★</span><small>Mega Fã</small>
      </button>}
      <button onClick={()=>setSheet("guests")}>
        <span>👥</span><small>{live.isHost?"Convidar":"Participar"}</small>
      </button>
      <button onClick={()=>setSheet("ranking")}>
        <span>🏆</span><small>Ranking</small>
      </button>
      {live.isHost&&<button onClick={()=>setSheet("battle")}>
        <span>⚔</span><small>Batalha</small>
      </button>}
      <button onClick={()=>void share()}>
        <span>↗</span><small>Compartilhar</small>
      </button>
      <button onClick={()=>setSheet("more")}>
        <span>•••</span><small>Mais</small>
      </button>
    </aside>

    {guestState.me?.status==="invited"&&<div className="live-invite-banner">
      <div>
        <strong>Convite para participar</strong>
        <span>O host convidou você para entrar com câmera e microfone.</span>
      </div>
      <button onClick={()=>void guestAction("accept")}>Aceitar</button>
      <button className="secondary" onClick={()=>void guestAction("reject")}>Recusar</button>
    </div>}

    {fanSpotlight&&<div className="live-fan-spotlight">
      <span>★</span><div><strong>{fanSpotlight}</strong><small>Mega Fã entrou na LIVE</small></div>
    </div>}

    {message&&<div className={"live-toast "+(message.kind==="success"?"is-success":"is-error")}>
      {message.text}
    </div>}

    <form className="live-composer" onSubmit={submitComment}>
      <input
        value={comment}
        onChange={e=>setComment(e.target.value)}
        maxLength={500}
        placeholder="Adicione um comentário..."
        aria-label="Comentário"
      />
      <button type="submit" disabled={!comment.trim()||busy==="comment"}>Enviar</button>
    </form>

    {summary&&<div className="live-summary-backdrop">
      <section className="live-summary">
        <div className="live-summary-mark">✓</div>
        <span className="eyebrow">LIVE ENCERRADA</span>
        <h2>Resumo da transmissão</h2>
        <p>{summary.title}</p>

        <div className="live-summary-grid">
          <div><span>Duração</span><strong>{summaryDuration}</strong></div>
          <div><span>Pico ao vivo</span><strong>{summary.peakViewers}</strong></div>
          <div><span>Comentários</span><strong>{summary.comments}</strong></div>
          <div><span>Presentes</span><strong>{summary.giftQuantity}</strong></div>
          <div><span>Diamantes</span><strong>◇ {summary.diamonds}</strong></div>
          <div><span>Novos seguidores</span><strong>+{summary.newFollowers}</strong></div>
        </div>

        <div className="live-summary-note">
          <strong>{summary.giftTransactions} transações de presentes</strong>
          <span>Os números são calculados diretamente dos registros da LIVE.</span>
        </div>

        <button className="button full" onClick={()=>{
          onEnded(live.id);
          onClose();
        }}>Voltar para as LIVEs</button>
      </section>
    </div>}

    {sheet!=="none"&&!summary&&<div className="live-sheet-backdrop" onClick={()=>setSheet("none")}>
      <section className="live-sheet" onClick={e=>e.stopPropagation()}>
        <div className="live-sheet-head">
          <div>
            <span className="eyebrow">SEVEN LIVE</span>
            <h3>{
              sheet==="gifts"?"Presentes":
              sheet==="guests"?(live.isHost?"Convidados":"Participar da LIVE"):
              sheet==="battle"?"Batalha":
              sheet==="fans"?"Mega Fã":
              sheet==="ranking"?"Ranking de presentes":
              sheet==="moderators"?"Moderadores":
              "Controles"
            }</h3>
          </div>
          <button onClick={()=>setSheet("none")}>×</button>
        </div>

        {sheet==="gifts"&&<div className="live-gift-grid">
          {gifts.length?gifts.map(gift=><button
            key={gift.id}
            onClick={()=>void sendGift(gift)}
            disabled={busy==="gift:"+gift.id}
          >
            <span className="live-gift-emoji">{gift.animationType==="3d"?"✦":"◇"}</span>
            <strong>{gift.name}</strong>
            <small>◇ {gift.priceDiamonds}</small>
          </button>):<p className="muted">Nenhum presente ativo.</p>}
        </div>}

        {sheet==="fans"&&!live.isHost&&<div className="stack">
          <div className="live-sheet-card">
            <strong>Seja Mega Fã de {live.hostDisplayName}</strong>
            <p>O Mega Fã é comprado com diamantes e fica vinculado a este criador pelo período do plano.</p>
          </div>
          <div className="live-fan-products">
            {fanProducts.map(product=><button
              key={product.code}
              onClick={()=>void buyFan(product)}
              disabled={busy==="fan:"+product.code}
            >
              <div><strong>{product.tier.replaceAll("_"," ")}</strong><span>{product.durationDays} dias</span></div>
              <b>◇ {product.priceDiamonds}</b>
            </button>)}
          </div>
        </div>}

        {sheet==="ranking"&&<div className="stack">
          <div className="live-sheet-card">
            <strong>Maiores apoiadores desta LIVE</strong>
            <p>Ranking calculado pelas transações reais de presentes e pelo valor em diamantes.</p>
          </div>
          <div className="live-ranking-list">
            {ranking.length?ranking.map(entry=><div key={entry.userId} className={"live-ranking-item "+(entry.position<=3?"is-top":"")}>
              <span className="live-ranking-position">{entry.position}</span>
              <span className="live-mini-avatar">{avatarText(entry.displayName)}</span>
              <div><strong>{entry.displayName}</strong><small>@{entry.username} · {entry.giftQuantity} presentes</small></div>
              <b>◇ {entry.diamonds}</b>
            </div>):<div className="live-sheet-card"><p>Ainda não houve presentes nesta LIVE.</p></div>}
          </div>
        </div>}

        {sheet==="guests"&&!live.isHost&&<div className="stack">
          <div className="live-sheet-card">
            <strong>Entrar como convidado</strong>
            <p>Se o host aceitar, você poderá publicar câmera e microfone nesta LIVE.</p>
          </div>
          {guestState.me?.status==="accepted"
            ?<button className="button secondary full" onClick={()=>void guestAction("leave")}>Sair do palco</button>
            :guestState.me?.status==="requested"
              ?<button className="button secondary full" disabled>Pedido enviado</button>
              :guestState.me?.status==="invited"
                ?<>
                  <button className="button full" onClick={()=>void guestAction("accept")}>Aceitar convite</button>
                  <button className="button secondary full" onClick={()=>void guestAction("reject")}>Recusar</button>
                </>
                :<button className="button full" onClick={()=>void requestGuest()} disabled={busy==="request"}>
                  Pedir para participar
                </button>
          }
        </div>}

        {sheet==="guests"&&live.isHost&&<div className="stack">
          {requests.length>0&&<div>
            <h4>Pedidos para entrar</h4>
            <div className="live-people-list">{requests.map(person=><div key={person.userId}>
              <span className="live-mini-avatar">{avatarText(person.displayName)}</span>
              <div><strong>{person.displayName}</strong><small>@{person.username}</small></div>
              <button onClick={()=>void hostGuestAction(person.userId,"accept")}>Aceitar</button>
            </div>)}</div>
          </div>}

          {(activeGuests.length>0||invited.length>0)&&<div>
            <h4>No palco / convidados</h4>
            <div className="live-people-list">{[...activeGuests,...invited].map(person=><div key={person.userId}>
              <span className="live-mini-avatar">{avatarText(person.displayName)}</span>
              <div>
                <strong>{person.displayName}</strong>
                <small>{person.status==="accepted"?"No palco":"Convite enviado"}</small>
              </div>
              <button className="danger" onClick={()=>void hostGuestAction(person.userId,"remove")}>Remover</button>
            </div>)}</div>
          </div>}

          <div>
            <h4>Convidar pessoas</h4>
            <div className="live-people-list">{suggestedUsers
              .filter(user=>user.id!==currentUserId&&!guestState.guests.some(g=>g.userId===user.id&&["accepted","invited"].includes(g.status)))
              .slice(0,12)
              .map(person=><div key={person.id}>
                <span className="live-mini-avatar">{avatarText(person.displayName)}</span>
                <div><strong>{person.displayName}</strong><small>@{person.username}</small></div>
                <button onClick={()=>void inviteUser(person.id)}>Convidar</button>
              </div>)}
            </div>
          </div>

          <div className="row between">
            <span>Layout dos participantes</span>
            <div className="live-segmented">
              <button className={layout==="grid"?"active":""} onClick={()=>setLayout("grid")}>Grade</button>
              <button className={layout==="focus"?"active":""} onClick={()=>setLayout("focus")}>Painel</button>
            </div>
          </div>
        </div>}

        {sheet==="moderators"&&live.isHost&&<div className="stack">
          <div className="live-sheet-card">
            <strong>Equipe de moderação</strong>
            <p>Moderadores podem fixar e excluir comentários e banir usuários durante a transmissão.</p>
          </div>

          {moderatorState.moderators.length>0&&<div>
            <h4>Moderadores atuais</h4>
            <div className="live-people-list">{moderatorState.moderators.map(person=><div key={person.userId}>
              <span className="live-mini-avatar">{avatarText(person.displayName)}</span>
              <div><strong>{person.displayName}</strong><small>@{person.username}</small></div>
              <button className="danger" onClick={()=>void manageModerator(person.userId,false)}>Remover</button>
            </div>)}</div>
          </div>}

          <div>
            <h4>Adicionar moderador</h4>
            <div className="live-people-list">{suggestedUsers
              .filter(user=>user.id!==currentUserId&&!moderatorState.moderators.some(mod=>mod.userId===user.id))
              .slice(0,12)
              .map(person=><div key={person.id}>
                <span className="live-mini-avatar">{avatarText(person.displayName)}</span>
                <div><strong>{person.displayName}</strong><small>@{person.username}</small></div>
                <button onClick={()=>void manageModerator(person.id,true)}>Adicionar</button>
              </div>)}
            </div>
          </div>
        </div>}

        {sheet==="battle"&&live.isHost&&<div className="stack">
          {battle?.status==="active"?<>
            <div className="live-sheet-card">
              <strong>Batalha em andamento</strong>
              <p>Presentes enviados para cada LIVE alimentam o placar em tempo real.</p>
            </div>
            <button className="button secondary full" onClick={()=>void battleAction("end")}>Encerrar batalha</button>
          </>:battle?.status==="invited"?<div className="live-sheet-card">
            <strong>Convite de batalha pendente</strong>
            <p>Aguardando resposta da outra LIVE.</p>
          </div>:<>
            <div className="live-sheet-card">
              <strong>Escolha uma LIVE</strong>
              <p>Convide outro host ao vivo para uma batalha de 3 minutos.</p>
            </div>
            <div className="live-people-list">{otherLives.map(item=><div key={item.id}>
              <span className="live-mini-avatar">{avatarText(item.hostDisplayName)}</span>
              <div><strong>{item.hostDisplayName}</strong><small>{item.title}</small></div>
              <button onClick={()=>void startBattle(item.id)}>Desafiar</button>
            </div>)}</div>
          </>}
        </div>}

        {sheet==="more"&&<div className="stack">
          {live.isHost&&<>
            <div className="row between">
              <span>Layout da LIVE</span>
              <div className="live-segmented">
                <button className={layout==="grid"?"active":""} onClick={()=>setLayout("grid")}>Grade</button>
                <button className={layout==="focus"?"active":""} onClick={()=>setLayout("focus")}>Painel</button>
              </div>
            </div>
            <button className="button secondary full" onClick={()=>setSheet("guests")}>Gerenciar convidados</button>
            <button className="button secondary full" onClick={()=>setSheet("moderators")}>Gerenciar moderadores</button>
            <button className="button secondary full" onClick={()=>setSheet("battle")}>Abrir batalha</button>
            <button className="button live-end full" onClick={()=>void endLive()} disabled={busy==="end"}>Encerrar LIVE</button>
          </>}
          {!live.isHost&&<>
            {fanProducts.length>0&&<button className="button secondary full" onClick={()=>setSheet("fans")}>Virar Mega Fã</button>}
            <button className="button secondary full" onClick={onClose}>Sair da LIVE</button>
            <button className="button live-end full" onClick={()=>void blockHost()} disabled={busy==="block"}>Bloquear criador</button>
          </>}
        </div>}
      </section>
    </div>}
  </div>;
}

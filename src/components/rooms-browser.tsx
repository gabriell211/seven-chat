"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RtcExperience } from "@/components/rtc-experience";

type Room={
  id:string;title:string;description:string;visibility:string;vipOnly:boolean;stageLimit:number;
  hostId:string;hostUsername:string;hostDisplayName:string;canPublishLocal:boolean;
};

export function RoomsBrowser({rooms,loggedIn}:{rooms:Room[];loggedIn:boolean}){
  const router=useRouter();
  const [active,setActive]=useState<string|null>(null);
  const [passwords,setPasswords]=useState<Record<string,string>>({});
  const [error,setError]=useState("");

  const create=async(form:FormData)=>{
    try{
      setError("");
      const response=await fetch("/api/v1/rooms",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
        title:String(form.get("title")??""),
        description:String(form.get("description")??""),
        visibility:String(form.get("visibility")??"public"),
        password:String(form.get("password")??"")||undefined,
        vipOnly:form.get("vipOnly")==="on"
      })});
      const body=await response.json();
      if(!response.ok)throw new Error(body?.error?.message??"Não foi possível criar a sala.");
      router.refresh();
    }catch(e){setError(e instanceof Error?e.message:"Falha ao criar sala.");}
  };

  return <div className="grid two">
    <section className="grid">
      {rooms.length===0?<div className="card empty"><div><div className="empty-icon">◉</div><strong>Nenhuma sala ativa agora.</strong><p>Crie uma sala e seja a primeira pessoa no palco.</p></div></div>:rooms.map(room=><article className="card stack" key={room.id}>
        <div className="posthead">
          <div className="userrow"><div className="avatar sm">{room.hostDisplayName[0]?.toUpperCase()}</div><div><h3 style={{margin:0}}>{room.title}</h3><div className="muted" style={{fontSize:12}}>por {room.hostDisplayName} · @{room.hostUsername}</div></div></div>
          <div className="row" style={{gap:6}}>{room.vipOnly&&<span className="vip-badge">VIP</span>}<span className="pill">{room.stageLimit} no palco</span></div>
        </div>
        <p className="muted" style={{margin:0,lineHeight:1.55}}>{room.description||"Sala aberta para conversar com a comunidade."}</p>
        <div className="row" style={{flexWrap:"wrap",gap:7}}><span className="pill">{room.visibility==="public"?"Pública":room.visibility==="password"?"Com senha":"Por convite"}</span><span className="pill"><span className="status-dot"/> ao vivo</span></div>
        {room.visibility==="password"&&!room.canPublishLocal&&<input className="input" type="password" placeholder="Senha da sala" value={passwords[room.id]??""} onChange={e=>setPasswords(v=>({...v,[room.id]:e.target.value}))}/>}
        {active===room.id?<RtcExperience resourceType="room" resourceId={room.id} mode="audio" canPublishLocal={room.canPublishLocal} password={passwords[room.id]}/>:<button className="button secondary" disabled={!loggedIn} onClick={()=>setActive(room.id)}>{loggedIn?"Entrar na sala":"Entre para participar"}</button>}
      </article>)}
    </section>

    <aside className="card stack">
      <div><span className="eyebrow">NOVA SALA</span><h3 style={{marginBottom:7}}>Crie seu espaço</h3><p className="muted" style={{marginTop:0}}>Palco com até 10 pessoas, privacidade configurável e opção exclusiva para VIP.</p></div>
      {error&&<div className="error" role="alert">{error}</div>}
      <form action={create} className="stack">
        <label className="field"><span>Título</span><input className="input" name="title" minLength={3} maxLength={100} placeholder="Sobre o que vamos conversar?" required disabled={!loggedIn}/></label>
        <label className="field"><span>Descrição</span><textarea className="textarea" name="description" maxLength={500} placeholder="Dê um contexto para quem entrar" disabled={!loggedIn}/></label>
        <label className="field"><span>Privacidade</span><select className="input" name="visibility" defaultValue="public" disabled={!loggedIn}><option value="public">Pública</option><option value="password">Com senha</option><option value="invite">Somente convite</option></select></label>
        <input className="input" name="password" type="password" minLength={6} maxLength={128} placeholder="Senha, se necessário" disabled={!loggedIn}/>
        <label className="legal-check"><input type="checkbox" name="vipOnly" disabled={!loggedIn}/><span>Exclusiva para membros VIP</span></label>
        <button className="button full" disabled={!loggedIn}>{loggedIn?"Criar sala":"Entre para criar"}</button>
      </form>
    </aside>
  </div>;
}
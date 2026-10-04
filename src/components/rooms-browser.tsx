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
      {rooms.length===0?<div className="card empty">Nenhuma sala ativa agora.</div>:rooms.map(room=><article className="card stack" key={room.id}>
        <div className="posthead"><div><h3 style={{margin:0}}>{room.title}</h3><div className="muted">por {room.hostDisplayName} · @{room.hostUsername}</div></div><div style={{display:"flex",gap:6}}>{room.vipOnly&&<span className="pill">VIP</span>}<span className="pill">{room.visibility}</span></div></div>
        <p className="muted">{room.description||"Sem descrição."}</p>
        {room.visibility==="password"&&!room.canPublishLocal&&<input className="input" type="password" placeholder="Senha da sala" value={passwords[room.id]??""} onChange={e=>setPasswords(v=>({...v,[room.id]:e.target.value}))}/>}
        {active===room.id?<RtcExperience resourceType="room" resourceId={room.id} mode="audio" canPublishLocal={room.canPublishLocal} password={passwords[room.id]}/>:<button className="button secondary" disabled={!loggedIn} onClick={()=>setActive(room.id)}>{loggedIn?"Abrir sala":"Entre para participar"}</button>}
      </article>)}
    </section>
    <aside className="card stack">
      <div><h3 style={{marginTop:0}}>Criar sala</h3><p className="muted">Palco de até 10 pessoas; ouvintes adicionais podem entrar.</p></div>
      {error&&<div className="error" role="alert">{error}</div>}
      <form action={create} className="stack">
        <input className="input" name="title" minLength={3} maxLength={100} placeholder="Título da sala" required disabled={!loggedIn}/>
        <textarea className="textarea" name="description" maxLength={500} placeholder="Descrição" disabled={!loggedIn}/>
        <select className="input" name="visibility" defaultValue="public" disabled={!loggedIn}><option value="public">Pública</option><option value="password">Com senha</option><option value="invite">Somente convite</option></select>
        <input className="input" name="password" type="password" minLength={6} maxLength={128} placeholder="Senha (se escolher com senha)" disabled={!loggedIn}/>
        <label style={{display:"flex",gap:8}}><input type="checkbox" name="vipOnly" disabled={!loggedIn}/> Exclusiva para VIP</label>
        <button className="button" disabled={!loggedIn}>Criar sala</button>
      </form>
    </aside>
  </div>;
}
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export type EditableProfile={
  displayName:string;bio:string;region:string|null;languages:string[];interests:string[];isPrivate:boolean;
};

function list(value:string){
  return [...new Set(value.split(",").map(v=>v.trim()).filter(Boolean))];
}

export function ProfileEditor({initial}:{initial:EditableProfile}){
  const router=useRouter();
  const [displayName,setDisplayName]=useState(initial.displayName);
  const [bio,setBio]=useState(initial.bio);
  const [region,setRegion]=useState(initial.region??"");
  const [languages,setLanguages]=useState(initial.languages.join(", "));
  const [interests,setInterests]=useState(initial.interests.join(", "));
  const [isPrivate,setIsPrivate]=useState(initial.isPrivate);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  async function save(e:FormEvent){
    e.preventDefault();
    try{
      setBusy(true);setMessage("");
      const response=await fetch("/api/v1/profile",{
        method:"PATCH",headers:{"content-type":"application/json"},
        body:JSON.stringify({
          displayName,bio,region:region.trim()||null,
          languages:list(languages),interests:list(interests),isPrivate
        })
      });
      const body=await response.json();
      if(!response.ok)throw new Error(body?.error?.message??"Não foi possível salvar o perfil.");
      setMessage("Perfil atualizado.");
      router.refresh();
    }catch(e){setMessage(e instanceof Error?e.message:"Falha ao salvar.");}
    finally{setBusy(false);}
  }

  return <section className="card stack" id="profile">
    <div className="settings-section-head">
      <div className="settings-section-icon">◎</div>
      <div><h3>Perfil público</h3><p>Esses dados aparecem no seu perfil e na descoberta.</p></div>
    </div>
    <form className="stack" onSubmit={save}>
      <label className="field"><span>Nome exibido</span><input className="input" value={displayName} onChange={e=>setDisplayName(e.target.value)} minLength={2} maxLength={60} required/></label>
      <label className="field"><span>Bio</span><textarea className="textarea" value={bio} onChange={e=>setBio(e.target.value)} maxLength={500} placeholder="Conte um pouco sobre você"/></label>
      <label className="field"><span>Região</span><input className="input" value={region} onChange={e=>setRegion(e.target.value)} maxLength={80} placeholder="Ex.: Santa Catarina, Brasil"/></label>
      <label className="field"><span>Idiomas</span><input className="input" value={languages} onChange={e=>setLanguages(e.target.value)} placeholder="Português, Inglês"/></label>
      <label className="field"><span>Interesses</span><input className="input" value={interests} onChange={e=>setInterests(e.target.value)} placeholder="Games, música, tecnologia"/></label>
      <label className="legal-check"><input type="checkbox" checked={isPrivate} onChange={e=>setIsPrivate(e.target.checked)}/><span>Perfil privado</span></label>
      {message&&<div className={message==="Perfil atualizado."?"success":"error"}>{message}</div>}
      <button className="button" disabled={busy}>{busy?"Salvando…":"Salvar perfil"}</button>
    </form>
  </section>;
}

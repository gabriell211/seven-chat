"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function PostComposer({username}:{username:string}){
  const router=useRouter();
  const [body,setBody]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  async function submit(e:FormEvent){
    e.preventDefault();
    const value=body.trim();if(!value)return;
    try{
      setBusy(true);setError("");
      const response=await fetch("/api/v1/posts",{
        method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify({body:value,visibility:"public",commentsEnabled:true,mediaAssetIds:[]})
      });
      const data=await response.json();
      if(!response.ok)throw new Error(data?.error?.message??"Não foi possível publicar.");
      setBody("");router.refresh();
    }catch(e){setError(e instanceof Error?e.message:"Falha ao publicar.");}
    finally{setBusy(false);}
  }

  return <form onSubmit={submit} className="card composer">
    <div className="composer-head">
      <div className="avatar sm">{username[0]?.toUpperCase()}</div>
      <div><strong>@{username}</strong><div className="muted" style={{fontSize:12}}>Compartilhe uma publicação de texto</div></div>
    </div>
    <textarea className="textarea" value={body} onChange={e=>setBody(e.target.value)} maxLength={4000} placeholder="No que você está pensando?" required disabled={busy}/>
    {error&&<div className="error">{error}</div>}
    <div className="composer-actions">
      <span className="muted" style={{fontSize:12}}>Publicação pública · texto</span>
      <button className="button compact" disabled={busy||!body.trim()}>{busy?"Publicando…":"Publicar"}</button>
    </div>
  </form>;
}

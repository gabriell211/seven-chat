"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function StartChatButton({userId}:{userId:string}){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  async function start(){
    try{
      setBusy(true);setError("");
      const response=await fetch("/api/v1/chat/conversations",{
        method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify({type:"direct",memberIds:[userId],isPrivate:false})
      });
      const body=await response.json();
      if(!response.ok)throw new Error(body?.error?.message??"Não foi possível abrir a conversa.");
      router.push("/chat?conversation="+body.data.id);
      router.refresh();
    }catch(e){setError(e instanceof Error?e.message:"Falha ao abrir conversa.");}
    finally{setBusy(false);}
  }
  return <div className="inline-action">
    <button className="button secondary" onClick={()=>void start()} disabled={busy}>{busy?"Abrindo…":"Mensagem"}</button>
    {error&&<small className="error-inline">{error}</small>}
  </div>;
}

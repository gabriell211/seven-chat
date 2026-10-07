"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function ChatThreadClient({conversationId}:{conversationId:string}){
  const router=useRouter();
  const [body,setBody]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  useEffect(()=>{
    const timer=window.setInterval(()=>router.refresh(),2500);
    return ()=>window.clearInterval(timer);
  },[router]);

  async function send(e:FormEvent){
    e.preventDefault();
    if(!body.trim())return;
    try{
      setBusy(true);setError("");
      const response=await fetch("/api/v1/chat/conversations/"+conversationId+"/messages",{
        method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify({type:"text",body:body.trim(),viewOnce:false})
      });
      const data=await response.json();
      if(!response.ok)throw new Error(data?.error?.message??"Não foi possível enviar a mensagem.");
      setBody("");
      router.refresh();
    }catch(e){setError(e instanceof Error?e.message:"Falha ao enviar mensagem.");}
    finally{setBusy(false);}
  }

  return <div className="chat-client-controls">
    {error&&<div className="error">{error}</div>}
    <form className="message-form" onSubmit={send}>
      <input className="input" value={body} onChange={e=>setBody(e.target.value)} maxLength={8000} placeholder="Escreva uma mensagem..." required disabled={busy}/>
      <button className="button" disabled={busy||!body.trim()}>{busy?"Enviando…":"Enviar"}</button>
    </form>
    <small className="muted">Atualização automática a cada 2,5 s. Realtime por websocket só será ativado quando o serviço correspondente estiver configurado.</small>
  </div>;
}

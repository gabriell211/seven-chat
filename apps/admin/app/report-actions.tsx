"use client";
import {useState} from "react";
export function ReportActions({id}:{id:string}){
  const [busy,setBusy]=useState(false),[message,setMessage]=useState("");
  async function act(action:string,status="resolved"){
    if(busy)return;const reason=window.prompt("Motivo da ação:");if(!reason||reason.trim().length<3)return;
    setBusy(true);setMessage("");
    const res=await fetch("/api/reports/"+id,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({status,action,reason})});
    const body=await res.json().catch(()=>({}));
    if(!res.ok){setMessage(body?.error?.message??"Falha na moderação.");setBusy(false);return;}
    window.location.reload();
  }
  return <div className="actions">
    <button disabled={busy} onClick={()=>act("warn")}>Avisar</button>
    <button disabled={busy} onClick={()=>act("restrict")}>Restringir</button>
    <button disabled={busy} onClick={()=>act("suspend")}>Suspender</button>
    <button disabled={busy} onClick={()=>act("ban")}>Banir</button>
    <button disabled={busy} onClick={()=>act("remove_content")}>Remover conteúdo</button>
    <button disabled={busy} className="ghost" onClick={()=>act("none","dismissed")}>Descartar</button>
    {message?<small>{message}</small>:null}
  </div>;
}
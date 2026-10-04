"use client";

import { useEffect, useState } from "react";

type DeviceSession={id:string;deviceName:string;platform:string;lastSeenAt:string;expiresAt:string};
type ExportState={id:string;status:string;requestedAt:string;completedAt:string|null;expiresAt:string|null;download:{url:string;expiresIn:number}|null}|null;
type DeletionState={id:string;status:string;scheduledFor:string;requestedAt:string}|null;

async function json<T>(url:string,init?:RequestInit):Promise<T>{
  const response=await fetch(url,{...init,headers:{"content-type":"application/json",...(init?.headers??{})}});
  const body=await response.json();
  if(!response.ok)throw new Error(body?.error?.message??"Falha na operação.");
  return body as T;
}

export function PrivacySettings(){
  const [sessions,setSessions]=useState<DeviceSession[]>([]);
  const [exportState,setExportState]=useState<ExportState>(null);
  const [deletion,setDeletion]=useState<DeletionState>(null);
  const [error,setError]=useState("");
  const load=async()=>{
    try{
      const [s,e,d]=await Promise.all([
        json<{data:DeviceSession[]}>("/api/v1/auth/sessions"),
        json<{data:ExportState}>("/api/v1/account/export"),
        json<{data:DeletionState}>("/api/v1/account/deletion")
      ]);
      setSessions(s.data);setExportState(e.data);setDeletion(d.data);setError("");
    }catch(e){setError(e instanceof Error?e.message:"Falha ao carregar configurações.");}
  };
  useEffect(()=>{void load();},[]);

  const revoke=async(sessionId:string)=>{
    await json("/api/v1/auth/sessions",{method:"DELETE",body:JSON.stringify({sessionId})});await load();
  };
  const revokeAll=async()=>{
    await json("/api/v1/auth/sessions",{method:"DELETE",body:JSON.stringify({all:true})});
    window.location.href="/login";
  };
  const requestExport=async()=>{
    await json("/api/v1/account/export",{method:"POST",body:"{}"});await load();
  };
  const scheduleDeletion=async()=>{
    if(!window.confirm("Sua conta será excluída em 30 dias. Deseja continuar?"))return;
    await json("/api/v1/account/deletion",{method:"POST",body:"{}"});await load();
  };
  const cancelDeletion=async()=>{
    await json("/api/v1/account/deletion",{method:"DELETE",body:"{}"});await load();
  };

  return <div className="grid">
    {error&&<div className="card error">{error}</div>}
    <section className="card stack">
      <div><h3 style={{marginTop:0}}>Sessões e dispositivos</h3><p className="muted">Revogue acessos que você não reconhece.</p></div>
      {sessions.length===0?<p className="muted">Nenhuma sessão nativa registrada.</p>:sessions.map(s=><div key={s.id} style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center"}}>
        <div><strong>{s.deviceName}</strong><div className="muted">{s.platform} · visto em {new Date(s.lastSeenAt).toLocaleString("pt-BR")}</div></div>
        <button className="button secondary" onClick={()=>void revoke(s.id)}>Revogar</button>
      </div>)}
      <button className="button secondary" onClick={()=>void revokeAll()}>Sair de todos os dispositivos</button>
    </section>

    <section className="card stack">
      <div><h3 style={{marginTop:0}}>Exportar meus dados</h3><p className="muted">Gera um arquivo privado com os dados associados à sua conta.</p></div>
      {exportState&&<p className="muted">Status: <strong>{exportState.status}</strong></p>}
      {exportState?.download?<a className="button" href={exportState.download.url}>Baixar exportação</a>:<button className="button secondary" onClick={()=>void requestExport()} disabled={exportState?.status==="queued"||exportState?.status==="processing"}>Solicitar exportação</button>}
    </section>

    <section className="card stack">
      <div><h3 style={{marginTop:0}}>Excluir conta</h3><p className="muted">A exclusão é agendada para 30 dias e pode ser cancelada antes da execução.</p></div>
      {deletion?.status==="scheduled"?<>
        <p className="muted">Exclusão marcada para {new Date(deletion.scheduledFor).toLocaleString("pt-BR")}.</p>
        <button className="button secondary" onClick={()=>void cancelDeletion()}>Cancelar exclusão</button>
      </>:<button className="button secondary" onClick={()=>void scheduleDeletion()}>Solicitar exclusão</button>}
    </section>
  </div>;
}
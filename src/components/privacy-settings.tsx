"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type DeviceSession={id:string;deviceName:string;platform:string;lastSeenAt:string;expiresAt:string};
export type ExportState={id:string;status:string;requestedAt:string;completedAt:string|null;expiresAt:string|null;download:{url:string;expiresIn:number}|null}|null;
export type DeletionState={id:string;status:string;scheduledFor:string;requestedAt:string}|null;

async function json<T>(url:string,init?:RequestInit):Promise<T>{
  const response=await fetch(url,{...init,headers:{"content-type":"application/json",...(init?.headers??{})}});
  const body=await response.json();
  if(!response.ok)throw new Error(body?.error?.message??"Falha na operação.");
  return body as T;
}

export function PrivacySettings({initialSessions,initialExport,initialDeletion}:{initialSessions:DeviceSession[];initialExport:ExportState;initialDeletion:DeletionState}){
  const router=useRouter();
  const [sessions,setSessions]=useState(initialSessions);
  const [exportState,setExportState]=useState(initialExport);
  const [deletion,setDeletion]=useState(initialDeletion);
  const [error,setError]=useState("");

  const load=async()=>{
    const [s,e,d]=await Promise.all([
      json<{data:DeviceSession[]}>("/api/v1/auth/sessions"),
      json<{data:ExportState}>("/api/v1/account/export"),
      json<{data:DeletionState}>("/api/v1/account/deletion")
    ]);
    setSessions(s.data);setExportState(e.data);setDeletion(d.data);setError("");
  };
  const run=async(fn:()=>Promise<void>)=>{try{setError("");await fn();}catch(e){setError(e instanceof Error?e.message:"Falha na operação.");}};
  const revoke=(sessionId:string)=>run(async()=>{await json("/api/v1/auth/sessions",{method:"DELETE",body:JSON.stringify({sessionId})});await load();});
  const revokeAll=()=>run(async()=>{await json("/api/v1/auth/sessions",{method:"DELETE",body:JSON.stringify({all:true})});router.push("/login");router.refresh();});
  const requestExport=()=>run(async()=>{await json("/api/v1/account/export",{method:"POST",body:"{}"});await load();});
  const refreshExport=()=>run(load);
  const scheduleDeletion=()=>run(async()=>{if(!window.confirm("Sua conta será excluída em 30 dias. Deseja continuar?"))return;await json("/api/v1/account/deletion",{method:"POST",body:"{}"});await load();});
  const cancelDeletion=()=>run(async()=>{await json("/api/v1/account/deletion",{method:"DELETE",body:"{}"});await load();});

  return <div className="grid">
    {error&&<div className="error" role="alert">{error}</div>}
    <section className="card stack">
      <div className="settings-section-head"><div className="settings-section-icon">⌁</div><div><h3>Sessões e dispositivos</h3><p>Revogue acessos que você não reconhece.</p></div></div>
      <div className="device-list">
        {sessions.length===0?<p className="muted">Nenhuma sessão ativa.</p>:sessions.map(s=><div key={s.id} className="device-item">
          <div><strong>{s.deviceName}</strong><span>{s.platform} · visto em {new Date(s.lastSeenAt).toLocaleString("pt-BR")}</span></div>
          <button className="button secondary compact" onClick={()=>void revoke(s.id)}>Revogar</button>
        </div>)}
      </div>
      <button className="button secondary" onClick={()=>void revokeAll()}>Sair de todos os dispositivos</button>
    </section>
    <section className="card stack">
      <div className="settings-section-head"><div className="settings-section-icon">⇩</div><div><h3>Exportar meus dados</h3><p>Gere um arquivo privado com os dados associados à sua conta.</p></div></div>
      {exportState&&<div className="row between"><span className="muted">Status da exportação</span><span className="pill">{exportState.status}</span></div>}
      {exportState?.download?<a className="button" href={exportState.download.url}>Baixar exportação</a>:<>
        <button className="button secondary" onClick={()=>void requestExport()} disabled={exportState?.status==="queued"||exportState?.status==="processing"}>Solicitar exportação</button>
        {(exportState?.status==="queued"||exportState?.status==="processing"||exportState?.status==="ready")&&<button className="button ghost" onClick={()=>void refreshExport()}>Atualizar status</button>}
      </>}
    </section>
    <section className="card stack danger-zone">
      <div className="settings-section-head"><div className="settings-section-icon">!</div><div><h3>Excluir conta</h3><p>A exclusão é agendada para 30 dias e pode ser cancelada antes da execução.</p></div></div>
      {deletion?.status==="scheduled"?<>
        <div className="error">Exclusão marcada para {new Date(deletion.scheduledFor).toLocaleString("pt-BR")}.</div>
        <button className="button secondary" onClick={()=>void cancelDeletion()}>Cancelar exclusão</button>
      </>:<button className="button secondary" onClick={()=>void scheduleDeletion()}>Solicitar exclusão da conta</button>}
    </section>
  </div>;
}
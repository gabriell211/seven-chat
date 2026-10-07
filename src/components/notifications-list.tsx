"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type NotificationItem={
  id:string;type:string;entityType:string|null;entityId:string|null;
  createdAt:string;readAt:string|null;actorName:string|null;actorUsername:string|null;
};

function label(type:string){
  const map:Record<string,string>={
    follow:"começou a seguir você",
    post_reaction:"reagiu à sua publicação",
    reaction:"reagiu ao seu conteúdo",
    comment:"comentou em uma publicação",
    message:"enviou uma mensagem",
    gift:"enviou um presente",
    live:"iniciou uma live",
    room:"abriu uma sala",
    live_guest_invite:"convidou você para participar da live",
    live_battle_invite:"convidou você para uma batalha"
  };
  return map[type]??type.replaceAll("_"," ");
}

function hrefFor(item:NotificationItem){
  if(item.type==="follow"&&item.actorUsername)return "/u/"+item.actorUsername;
  if(item.entityType==="post"&&item.entityId)return "/feed#post-"+item.entityId;
  if(item.entityType==="live")return "/lives";
  if(item.entityType==="room")return "/rooms";
  if(item.entityType==="conversation")return "/chat";
  return null;
}

export function NotificationsList({initial}:{initial:NotificationItem[]}){
  const [rows,setRows]=useState(initial);
  const [busy,setBusy]=useState(false);
  const unread=useMemo(()=>rows.filter(n=>!n.readAt).length,[rows]);

  async function mark(id?:string){
    try{
      setBusy(true);
      const response=await fetch("/api/v1/notifications",{
        method:"PATCH",headers:{"content-type":"application/json"},
        body:JSON.stringify(id?{id}:{all:true})
      });
      if(!response.ok)return;
      const now=new Date().toISOString();
      setRows(current=>current.map(n=>!id||n.id===id?{...n,readAt:n.readAt??now}:n));
    }finally{setBusy(false);}
  }

  return <>
    <div className="notification-toolbar">
      <span className="pill">{unread} novas</span>
      <button className="button secondary compact" disabled={busy||unread===0} onClick={()=>void mark()}>Marcar todas como lidas</button>
    </div>
    <section className="card notification-list">
      {rows.length?rows.map(n=>{
        const href=hrefFor(n);
        const content=<>
          <div className="notification-icon">{n.type.includes("gift")?"◇":n.type.includes("message")?"✉":"✦"}</div>
          <div className="notification-copy">
            <strong>{n.actorName?n.actorName+" "+label(n.type):label(n.type)}</strong>
            <span>{new Date(n.createdAt).toLocaleString("pt-BR")}</span>
          </div>
          {!n.readAt&&<button className="notification-read" onClick={(e)=>{e.preventDefault();e.stopPropagation();void mark(n.id)}} aria-label="Marcar como lida"><span className="status-dot"/></button>}
        </>;
        return href?<Link href={href} onClick={()=>{if(!n.readAt)void mark(n.id)}} className={"notification-item "+(!n.readAt?"is-unread":"")} key={n.id}>{content}</Link>
          :<article className={"notification-item "+(!n.readAt?"is-unread":"")} key={n.id}>{content}</article>;
      }):<div className="empty"><div><div className="empty-icon">✓</div><strong>Tudo tranquilo por aqui.</strong><p>Quando alguém interagir com você, a atividade vai aparecer nesta lista.</p></div></div>}
    </section>
  </>;
}

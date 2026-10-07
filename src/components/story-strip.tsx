"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export type TextStory={id:string;username:string;displayName:string;textContent:string;createdAt:string};

export function StoryStrip({stories}:{stories:TextStory[]}){
  const router=useRouter();
  const [createOpen,setCreateOpen]=useState(false);
  const [active,setActive]=useState<TextStory|null>(null);
  const [text,setText]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  async function create(e:FormEvent){
    e.preventDefault();
    if(!text.trim())return;
    try{
      setBusy(true);setError("");
      const response=await fetch("/api/v1/stories",{
        method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify({type:"text",textContent:text.trim()})
      });
      const body=await response.json();
      if(!response.ok)throw new Error(body?.error?.message??"Não foi possível publicar o story.");
      setText("");setCreateOpen(false);router.refresh();
    }catch(e){setError(e instanceof Error?e.message:"Falha ao publicar story.");}
    finally{setBusy(false);}
  }

  async function view(story:TextStory){
    setActive(story);setError("");
    try{await fetch("/api/v1/stories/"+story.id+"/view",{method:"POST"});}catch{}
  }

  return <>
    <section className="stories-strip">
      <button className="story-item story-create story-button" onClick={()=>setCreateOpen(true)}>
        <span className="story-ring"><span className="story-avatar">+</span></span>
        <small>Seu story</small>
      </button>
      {stories.map(s=><button className="story-item story-button" key={s.id} onClick={()=>void view(s)}>
        <span className="story-ring"><span className="story-avatar">{s.displayName[0]?.toUpperCase()}</span></span>
        <small>{s.displayName.split(" ")[0]}</small>
      </button>)}
    </section>

    {createOpen&&<div className="story-modal-backdrop" onMouseDown={()=>setCreateOpen(false)}>
      <form className="story-modal" onSubmit={create} onMouseDown={e=>e.stopPropagation()}>
        <div className="row between"><div><span className="eyebrow">NOVO STORY</span><h3>Story de texto</h3></div><button type="button" className="seven-live-close" onClick={()=>setCreateOpen(false)}>×</button></div>
        <textarea className="textarea story-textarea" value={text} onChange={e=>setText(e.target.value)} maxLength={2000} placeholder="O que você quer compartilhar?" required/>
        {error&&<div className="error">{error}</div>}
        <button className="button full" disabled={busy||!text.trim()}>{busy?"Publicando…":"Publicar por 24 horas"}</button>
      </form>
    </div>}

    {active&&<div className="story-modal-backdrop" onMouseDown={()=>setActive(null)}>
      <article className="story-viewer" onMouseDown={e=>e.stopPropagation()}>
        <div className="story-viewer-top">
          <div className="userrow"><div className="avatar sm">{active.displayName[0]?.toUpperCase()}</div><div><strong>{active.displayName}</strong><span>@{active.username}</span></div></div>
          <button className="seven-live-close" onClick={()=>setActive(null)}>×</button>
        </div>
        <div className="story-viewer-content">{active.textContent}</div>
        <small>{new Date(active.createdAt).toLocaleString("pt-BR")}</small>
      </article>
    </div>}
  </>;
}

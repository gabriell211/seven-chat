"use client";

import { FormEvent, useState } from "react";

type Comment={id:string;body:string;createdAt:string;username:string;displayName:string};

export function PostActions({postId,loggedIn,initialLiked=false,initialSaved=false}:{postId:string;loggedIn:boolean;initialLiked?:boolean;initialSaved?:boolean}){
  const [liked,setLiked]=useState(initialLiked);
  const [saved,setSaved]=useState(initialSaved);
  const [commentsOpen,setCommentsOpen]=useState(false);
  const [comments,setComments]=useState<Comment[]>([]);
  const [body,setBody]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  async function request(url:string,init?:RequestInit){
    const response=await fetch(url,{...init,headers:{"content-type":"application/json",...(init?.headers??{})}});
    const json=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(json?.error?.message??"Não foi possível concluir.");
    return json;
  }

  async function toggleLike(){
    if(!loggedIn){location.href="/login";return;}
    try{
      setBusy(true);setMessage("");
      await request("/api/v1/posts/"+postId+"/reactions",{method:liked?"DELETE":"PUT",body:liked?undefined:JSON.stringify({reaction:"like"})});
      setLiked(v=>!v);
    }catch(e){setMessage(e instanceof Error?e.message:"Falha ao reagir.");}
    finally{setBusy(false);}
  }

  async function toggleSave(){
    if(!loggedIn){location.href="/login";return;}
    try{
      setBusy(true);setMessage("");
      await request("/api/v1/posts/"+postId+"/save",{method:saved?"DELETE":"PUT"});
      setSaved(v=>!v);
    }catch(e){setMessage(e instanceof Error?e.message:"Falha ao salvar.");}
    finally{setBusy(false);}
  }

  async function openComments(){
    try{
      setCommentsOpen(v=>!v);setMessage("");
      if(!commentsOpen){
        const json=await request("/api/v1/posts/"+postId+"/comments");
        setComments(json.data??[]);
      }
    }catch(e){setMessage(e instanceof Error?e.message:"Falha ao carregar comentários.");}
  }

  async function sendComment(e:FormEvent){
    e.preventDefault();
    if(!loggedIn){location.href="/login";return;}
    if(!body.trim())return;
    try{
      setBusy(true);setMessage("");
      await request("/api/v1/posts/"+postId+"/comments",{method:"POST",body:JSON.stringify({body:body.trim()})});
      setBody("");
      const json=await request("/api/v1/posts/"+postId+"/comments");
      setComments(json.data??[]);
    }catch(e){setMessage(e instanceof Error?e.message:"Falha ao comentar.");}
    finally{setBusy(false);}
  }

  async function share(){
    const url=location.origin+"/feed#post-"+postId;
    try{
      if(navigator.share)await navigator.share({title:"Seven Chat",url});
      else{await navigator.clipboard.writeText(url);setMessage("Link copiado.");}
    }catch{}
  }

  return <div className="post-interactions">
    <div className="post-actions social-actions">
      <button className={"post-action "+(liked?"is-active":"")} disabled={busy} onClick={()=>void toggleLike()}>{liked?"♥":"♡"} Curtir</button>
      <button className="post-action" onClick={()=>void openComments()}>◌ Comentar</button>
      <button className="post-action" onClick={()=>void share()}>↗ Compartilhar</button>
      <button className={"post-action "+(saved?"is-active":"")} disabled={busy} onClick={()=>void toggleSave()}>{saved?"▣":"⌑"} Salvar</button>
    </div>
    {message&&<div className="post-action-message">{message}</div>}
    {commentsOpen&&<div className="post-comments">
      <div className="post-comments-list">
        {comments.length?comments.map(c=><div className="post-comment" key={c.id}><strong>{c.displayName}</strong><span>{c.body}</span></div>):<span className="muted">Seja a primeira pessoa a comentar.</span>}
      </div>
      <form onSubmit={sendComment} className="post-comment-form">
        <input className="input" value={body} onChange={e=>setBody(e.target.value)} placeholder={loggedIn?"Escreva um comentário...":"Entre para comentar"} maxLength={2000} disabled={busy}/>
        <button className="button compact" disabled={busy||!body.trim()}>Enviar</button>
      </form>
    </div>}
  </div>;
}

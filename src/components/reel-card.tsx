"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Reel={
  id:string;caption:string;videoUrl:string;thumbnailUrl:string|null;
  mediaAssetId:string|null;thumbnailAssetId:string|null;durationMs:number;
  viewCount:number;createdAt:string;username:string;displayName:string;
};

async function signedUrl(assetId:string){
  const response=await fetch("/api/v1/media/"+assetId+"/download",{cache:"no-store"});
  const body=await response.json();
  if(!response.ok||typeof body?.data?.url!=="string")throw new Error(body?.error?.message??"Mídia indisponível.");
  return body.data.url as string;
}

export function ReelCard({reel}:{reel:Reel}){
  const [videoSrc,setVideoSrc]=useState(reel.videoUrl);
  const [poster,setPoster]=useState(reel.thumbnailUrl??undefined);
  const [views,setViews]=useState(reel.viewCount);
  const [error,setError]=useState("");
  const counted=useRef(false);

  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      try{
        if(reel.mediaAssetId){
          const url=await signedUrl(reel.mediaAssetId);
          if(!cancelled)setVideoSrc(url);
        }
        if(reel.thumbnailAssetId){
          const url=await signedUrl(reel.thumbnailAssetId);
          if(!cancelled)setPoster(url);
        }
      }catch(e){
        if(!cancelled)setError(e instanceof Error?e.message:"Mídia indisponível.");
      }
    })();
    return ()=>{cancelled=true;};
  },[reel.mediaAssetId,reel.thumbnailAssetId]);

  async function registerView(){
    if(counted.current)return;
    counted.current=true;
    try{
      const response=await fetch("/api/v1/reels/"+reel.id+"/view",{method:"POST"});
      const body=await response.json();
      if(response.ok&&typeof body?.data?.viewCount==="number")setViews(body.data.viewCount);
    }catch{}
  }

  return <article className="reel-card">
    <div className="reel-media">
      {videoSrc?<video controls playsInline preload="metadata" poster={poster} src={videoSrc} onPlay={()=>void registerView()}/>:<div className="reel-media-loading">{error||"Carregando mídia…"}</div>}
      <span className="reel-duration">{Math.max(1,Math.round(reel.durationMs/1000))}s</span>
    </div>
    <div className="reel-copy">
      <Link className="userrow" href={"/u/"+reel.username}>
        <div className="avatar sm">{reel.displayName[0]?.toUpperCase()}</div>
        <div><strong>{reel.displayName}</strong><div className="muted" style={{fontSize:12}}>@{reel.username}</div></div>
      </Link>
      {reel.caption&&<p>{reel.caption}</p>}
      <div className="row between"><span className="muted" style={{fontSize:12}}>{views} visualizações únicas</span><span className="pill">{new Date(reel.createdAt).toLocaleDateString("pt-BR")}</span></div>
    </div>
  </article>;
}

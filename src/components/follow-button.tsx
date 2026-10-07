"use client";

import { useState } from "react";

export function FollowButton({userId,initialFollowing}:{userId:string;initialFollowing:boolean}){
  const [following,setFollowing]=useState(initialFollowing);
  const [busy,setBusy]=useState(false);
  async function toggle(){
    try{
      setBusy(true);
      const response=await fetch("/api/v1/users/"+userId+"/follow",{method:following?"DELETE":"POST"});
      if(response.ok)setFollowing(v=>!v);
    }finally{setBusy(false);}
  }
  return <button className={following?"button secondary":"button"} onClick={()=>void toggle()} disabled={busy}>
    {busy?"Aguarde…":following?"Seguindo":"Seguir"}
  </button>;
}

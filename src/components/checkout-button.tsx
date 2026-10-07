"use client";

import { useState } from "react";

export function CheckoutButton({productType,sku,label}:{productType:"diamonds"|"vip";sku:string;label:string}){
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  async function checkout(){
    try{
      setBusy(true);setError("");
      const response=await fetch("/api/v1/store/infinitepay/checkout",{
        method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify({productType,sku})
      });
      const body=await response.json();
      if(!response.ok)throw new Error(body?.error?.message??"Não foi possível iniciar o pagamento.");
      const url=body?.data?.checkoutUrl;
      if(typeof url!=="string"||!url)throw new Error("Checkout não retornou uma URL válida.");
      window.location.assign(url);
    }catch(e){setError(e instanceof Error?e.message:"Falha ao iniciar pagamento.");}
    finally{setBusy(false);}
  }
  return <div className="checkout-action">
    <button className="button full" onClick={()=>void checkout()} disabled={busy}>{busy?"Abrindo pagamento…":label}</button>
    {error&&<small className="error-inline">{error}</small>}
  </div>;
}

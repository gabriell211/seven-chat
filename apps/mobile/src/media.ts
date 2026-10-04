import {api} from "./api";

export type LocalMedia={uri:string;mimeType?:string|null;fileSize?:number|null;duration?:number|null;type?:"image"|"video"|string|null};
type Purpose="post"|"story"|"reel"|"chat"|"avatar"|"banner"|"live_thumbnail";

function sleep(ms:number){return new Promise(resolve=>setTimeout(resolve,ms));}

export async function uploadMedia(asset:LocalMedia,purpose:Purpose):Promise<{assetId:string;durationMs:number}>{
  const local=await fetch(asset.uri);
  const blob=await local.blob();
  const mime=asset.mimeType||blob.type;
  const sizeBytes=asset.fileSize||blob.size;
  if(!mime||!sizeBytes)throw new Error("Não foi possível identificar a mídia.");
  const authorized=await api<{data:{assetId:string;uploadUrl:string;requiredHeaders:Record<string,string>}}>("/api/v1/media/uploads",{
    method:"POST",body:JSON.stringify({purpose,mime,sizeBytes})
  });
  const upload=await fetch(authorized.data.uploadUrl,{method:"PUT",headers:authorized.data.requiredHeaders,body:blob});
  if(!upload.ok)throw new Error("Falha ao enviar a mídia para o storage.");
  await api("/api/v1/media/uploads/"+authorized.data.assetId+"/complete",{method:"POST"});
  for(let attempt=0;attempt<45;attempt++){
    const state=await api<{data:{status:string;durationMs:number|null}}>("/api/v1/media/"+authorized.data.assetId);
    if(state.data.status==="ready")return {assetId:authorized.data.assetId,durationMs:state.data.durationMs??asset.duration??0};
    if(["rejected","failed","deleted"].includes(state.data.status))throw new Error("A mídia foi rejeitada ou falhou no processamento.");
    await sleep(1000);
  }
  throw new Error("A mídia ainda está processando. Tente novamente em instantes.");
}

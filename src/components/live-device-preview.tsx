"use client";

import { useEffect, useRef, useState } from "react";

export function LiveDevicePreview({
  cameraEnabled,
  microphoneEnabled,
  onCameraChange,
  onMicrophoneChange,
  compact=false
}:{
  cameraEnabled:boolean;
  microphoneEnabled:boolean;
  onCameraChange:(enabled:boolean)=>void;
  onMicrophoneChange:(enabled:boolean)=>void;
  compact?:boolean;
}){
  const videoRef=useRef<HTMLVideoElement>(null);
  const [error,setError]=useState("");
  const [ready,setReady]=useState(false);

  useEffect(()=>{
    let stream:MediaStream|null=null;
    let cancelled=false;

    const start=async()=>{
      if(!cameraEnabled&&!microphoneEnabled){
        if(videoRef.current)videoRef.current.srcObject=null;
        setReady(false);
        return;
      }

      try{
        setError("");
        stream=await navigator.mediaDevices.getUserMedia({
          video:cameraEnabled,
          audio:microphoneEnabled
        });
        if(cancelled){
          stream.getTracks().forEach(track=>track.stop());
          return;
        }
        if(videoRef.current)videoRef.current.srcObject=stream;
        setReady(true);
      }catch{
        setReady(false);
        setError("Permita acesso à câmera e ao microfone para testar antes da LIVE.");
      }
    };

    void start();

    return()=>{
      cancelled=true;
      stream?.getTracks().forEach(track=>track.stop());
      if(videoRef.current)videoRef.current.srcObject=null;
    };
  },[cameraEnabled,microphoneEnabled]);

  return <div className={"live-device-preview "+(compact?"is-compact":"")}>
    <div className="live-device-video">
      {cameraEnabled?<video ref={videoRef} autoPlay muted playsInline/>:<div className="live-device-off">Câmera desligada</div>}
      {ready&&<span className="live-device-ready">● Prévia ativa</span>}
    </div>
    {error&&<div className="live-device-error">{error}</div>}
    <div className="live-device-controls">
      <button
        type="button"
        className={microphoneEnabled?"is-on":""}
        onClick={()=>onMicrophoneChange(!microphoneEnabled)}
      >
        <span>{microphoneEnabled?"🎙":"🔇"}</span>
        {microphoneEnabled?"Microfone ligado":"Microfone desligado"}
      </button>
      <button
        type="button"
        className={cameraEnabled?"is-on":""}
        onClick={()=>onCameraChange(!cameraEnabled)}
      >
        <span>{cameraEnabled?"📹":"🚫"}</span>
        {cameraEnabled?"Câmera ligada":"Câmera desligada"}
      </button>
    </div>
  </div>;
}

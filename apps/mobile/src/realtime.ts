import {api} from "./api";

type Handler=(event:{channel?:string;event?:string;data?:unknown;type?:string})=>void;
export class SevenRealtime{
  private socket:WebSocket|null=null;
  private stopped=false;
  private attempt=0;
  private channels=new Set<string>();
  private handlers=new Set<Handler>();
  on(handler:Handler){this.handlers.add(handler);return()=>this.handlers.delete(handler);}
  subscribe(channel:string){this.channels.add(channel);if(this.socket?.readyState===WebSocket.OPEN)this.socket.send(JSON.stringify({type:"subscribe",channel}));}
  unsubscribe(channel:string){this.channels.delete(channel);if(this.socket?.readyState===WebSocket.OPEN)this.socket.send(JSON.stringify({type:"unsubscribe",channel}));}
  async start(){this.stopped=false;await this.connect();}
  stop(){this.stopped=true;this.socket?.close();this.socket=null;}
  private async connect(){
    if(this.stopped)return;
    try{
      const access=await api<{data:{token:string;url:string}}>("/api/v1/realtime/token",{method:"POST"});
      const ws=new WebSocket(access.data.url,["seven-chat",access.data.token]);
      this.socket=ws;
      ws.onopen=()=>{this.attempt=0;for(const channel of this.channels)ws.send(JSON.stringify({type:"subscribe",channel}));};
      ws.onmessage=(message)=>{try{const event=JSON.parse(String(message.data));for(const h of this.handlers)h(event);}catch{}};
      ws.onerror=()=>ws.close();
      ws.onclose=()=>{if(!this.stopped)setTimeout(()=>void this.connect(),Math.min(15000,500*2**Math.min(++this.attempt,5)));};
    }catch{if(!this.stopped)setTimeout(()=>void this.connect(),Math.min(15000,500*2**Math.min(++this.attempt,5)));}
  }
}

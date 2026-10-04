import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { TextEncoder } from "node:util";
import pg from "pg";
import { jwtVerify } from "jose";
import { WebSocket, WebSocketServer } from "ws";
import { z } from "zod";

const {Pool,Client}=pg;
const PORT=Number(process.env.PORT??8080);
const DATABASE_URL=process.env.DATABASE_URL;
const SESSION_SECRET=process.env.SESSION_SECRET;
if(!DATABASE_URL)throw new Error("DATABASE_URL_MISSING");
if(!SESSION_SECRET||SESSION_SECRET.length<32)throw new Error("SESSION_SECRET_MISSING");
const secret=new TextEncoder().encode(SESSION_SECRET);
const ssl=process.env.NODE_ENV==="production"?{rejectUnauthorized:false}:undefined;
const pool=new Pool({connectionString:DATABASE_URL,max:10,ssl});
const allowedOrigins=new Set((process.env.ALLOWED_ORIGINS??"").split(",").map(v=>v.trim()).filter(Boolean));
if(process.env.NODE_ENV==="production"&&allowedOrigins.size===0)throw new Error("ALLOWED_ORIGINS_MISSING");

type ClientMeta={
  userId:string;sessionId:string;subscriptions:Set<string>;alive:boolean;
  windowStartedAt:number;eventsInWindow:number;
};
const clients=new Map<WebSocket,ClientMeta>();
const identities=new WeakMap<WebSocket,{userId:string;sessionId:string}>();
const wss=new WebSocketServer({noServer:true,maxPayload:16*1024});

const command=z.discriminatedUnion("type",[
  z.object({type:z.literal("subscribe"),channel:z.string().min(3).max(120)}),
  z.object({type:z.literal("unsubscribe"),channel:z.string().min(3).max(120)}),
  z.object({type:z.literal("typing"),conversationId:z.uuid(),active:z.boolean()}),
  z.object({type:z.literal("ping")})
]);

function send(ws:WebSocket,value:unknown){
  if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(value));
}
function validOrigin(origin:string|undefined){
  return !origin||allowedOrigins.size===0||allowedOrigins.has(origin);
}
async function authenticate(token:string){
  const {payload}=await jwtVerify(token,secret);
  if(payload.scope!=="realtime"||typeof payload.userId!=="string"||typeof payload.sessionId!=="string")throw new Error("INVALID_TOKEN");
  const result=await pool.query(
    `select 1 from user_sessions s join users u on u.id=s.user_id
     where s.id=$1 and s.user_id=$2 and s.revoked_at is null and s.expires_at>now() and u.status='active' limit 1`,
    [payload.sessionId,payload.userId]
  );
  if(!result.rowCount)throw new Error("SESSION_REVOKED");
  return {userId:payload.userId,sessionId:payload.sessionId};
}
function parseChannel(channel:string){
  const idx=channel.indexOf(":");
  if(idx<1)return null;
  const kind=channel.slice(0,idx),id=channel.slice(idx+1);
  if(!/^[0-9a-f-]{36}$/i.test(id))return null;
  return {kind,id};
}
async function canSubscribe(userId:string,channel:string){
  const parsed=parseChannel(channel);if(!parsed)return false;
  if(parsed.kind==="conversation"){
    const r=await pool.query("select 1 from conversation_members where conversation_id=$1 and user_id=$2 limit 1",[parsed.id,userId]);
    return Boolean(r.rowCount);
  }
  if(parsed.kind==="room"){
    const r=await pool.query(`select 1 from room_members rm join rooms r on r.id=rm.room_id where rm.room_id=$1 and rm.user_id=$2 and r.status='active' limit 1`,[parsed.id,userId]);
    return Boolean(r.rowCount);
  }
  if(parsed.kind==="live"){
    const r=await pool.query("select 1 from live_sessions where id=$1 and status in ('created','live') limit 1",[parsed.id]);
    return Boolean(r.rowCount);
  }
  if(parsed.kind==="user"){
    if(parsed.id===userId)return true;
    const blocked=await pool.query(`select 1 from blocks where (blocker_id=$1 and blocked_id=$2) or (blocker_id=$2 and blocked_id=$1) limit 1`,[userId,parsed.id]);
    if(blocked.rowCount)return false;
    const target=await pool.query<{is_private:boolean}>("select is_private from profiles where user_id=$1",[parsed.id]);
    if(!target.rowCount)return false;
    if(!target.rows[0]?.is_private)return true;
    const follow=await pool.query("select 1 from follows where follower_id=$1 and following_id=$2 limit 1",[userId,parsed.id]);
    return Boolean(follow.rowCount);
  }
  return false;
}
async function publish(channel:string,event:string,data:Record<string,unknown>){
  const payload=JSON.stringify({id:randomUUID(),channel,event,data,createdAt:new Date().toISOString()});
  if(Buffer.byteLength(payload)>7500)return;
  await pool.query("select pg_notify('seven_events',$1)",[payload]);
}
function withinRate(meta:ClientMeta){
  const now=Date.now();
  if(now-meta.windowStartedAt>10_000){meta.windowStartedAt=now;meta.eventsInWindow=0;}
  meta.eventsInWindow++;
  return meta.eventsInWindow<=60;
}
function broadcast(raw:string){
  let event:{channel?:string};
  try{event=JSON.parse(raw) as {channel?:string};}catch{return;}
  if(typeof event.channel!=="string")return;
  for(const [ws,meta] of clients){
    if(meta.subscriptions.has(event.channel))send(ws,event);
  }
}

wss.on("connection",(ws)=>{
  const identity=identities.get(ws);
  if(!identity){ws.close(1008,"identity missing");return;}
  identities.delete(ws);
  const meta:ClientMeta={...identity,subscriptions:new Set([`user:${identity.userId}`]),alive:true,windowStartedAt:Date.now(),eventsInWindow:0};
  clients.set(ws,meta);
  send(ws,{type:"ready",userId:identity.userId,heartbeatSeconds:30});

  ws.on("pong",()=>{meta.alive=true;});
  ws.on("message",async raw=>{
    if(!withinRate(meta)){send(ws,{type:"error",code:"RATE_LIMITED"});return;}
    let input:unknown;try{input=JSON.parse(raw.toString());}catch{send(ws,{type:"error",code:"INVALID_JSON"});return;}
    const parsed=command.safeParse(input);if(!parsed.success){send(ws,{type:"error",code:"INVALID_EVENT"});return;}
    try{
      if(parsed.data.type==="ping"){send(ws,{type:"pong",at:Date.now()});return;}
      if(parsed.data.type==="subscribe"){
        if(meta.subscriptions.size>=100){send(ws,{type:"error",code:"SUBSCRIPTION_LIMIT"});return;}
        if(!await canSubscribe(meta.userId,parsed.data.channel)){send(ws,{type:"error",code:"FORBIDDEN_CHANNEL"});return;}
        meta.subscriptions.add(parsed.data.channel);send(ws,{type:"subscribed",channel:parsed.data.channel});return;
      }
      if(parsed.data.type==="unsubscribe"){
        if(parsed.data.channel!==`user:${meta.userId}`)meta.subscriptions.delete(parsed.data.channel);
        send(ws,{type:"unsubscribed",channel:parsed.data.channel});return;
      }
      const channel=`conversation:${parsed.data.conversationId}`;
      if(!meta.subscriptions.has(channel)||!await canSubscribe(meta.userId,channel)){send(ws,{type:"error",code:"FORBIDDEN_CHANNEL"});return;}
      await publish(channel,parsed.data.active?"typing.started":"typing.stopped",{userId:meta.userId});
    }catch{send(ws,{type:"error",code:"EVENT_FAILED"});}
  });
  ws.on("close",()=>{clients.delete(ws);});
});

const server=createServer(async(req,res)=>{
  if(req.url==="/health"){
    try{await pool.query("select 1");res.writeHead(200,{"content-type":"application/json"});res.end(JSON.stringify({ok:true,clients:clients.size}));}
    catch{res.writeHead(503,{"content-type":"application/json"});res.end(JSON.stringify({ok:false}));}
    return;
  }
  res.writeHead(404);res.end();
});
server.on("upgrade",async(req,socket,head)=>{
  try{
    if(!validOrigin(req.headers.origin)){socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");socket.destroy();return;}
    const url=new URL(req.url??"/","http://localhost");
    if(url.pathname!=="/ws"){socket.destroy();return;}
    const protocols=(req.headers["sec-websocket-protocol"]??"").split(",").map(v=>v.trim()).filter(Boolean);
    if(protocols[0]!=="seven-chat"||!protocols[1])throw new Error("TOKEN_MISSING");
    const identity=await authenticate(protocols[1]);
    wss.handleUpgrade(req,socket,head,ws=>{identities.set(ws,identity);wss.emit("connection",ws,req);});
  }catch{socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");socket.destroy();}
});

let listener:pg.Client|null=null;
async function connectListener(){
  try{
    listener=new Client({connectionString:DATABASE_URL,ssl});
    await listener.connect();
    await listener.query("listen seven_events");
    listener.on("notification",msg=>{if(msg.payload)broadcast(msg.payload);});
    listener.on("error",()=>{void reconnectListener();});
    listener.on("end",()=>{void reconnectListener();});
  }catch{setTimeout(()=>void connectListener(),2000);}
}
let reconnecting=false;
async function reconnectListener(){
  if(reconnecting)return;reconnecting=true;
  try{await listener?.end();}catch{}
  listener=null;setTimeout(()=>{reconnecting=false;void connectListener();},1500);
}
const heartbeat=setInterval(()=>{
  for(const [ws,meta] of clients){
    if(!meta.alive){ws.terminate();clients.delete(ws);continue;}
    meta.alive=false;ws.ping();
  }
},30_000);

server.listen(PORT,()=>console.log(`seven-chat-realtime listening on :${PORT}`));
void connectListener();

async function shutdown(){
  clearInterval(heartbeat);
  for(const ws of clients.keys())ws.close(1012,"service restart");
  await new Promise<void>(resolve=>server.close(()=>resolve()));
  try{await listener?.end();}catch{}
  await pool.end();
  process.exit(0);
}
process.on("SIGTERM",()=>void shutdown());
process.on("SIGINT",()=>void shutdown());

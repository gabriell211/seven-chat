import {performance} from "node:perf_hooks";
const base=process.env.BASE_URL;if(!base)throw new Error("BASE_URL is required");
const concurrency=Number(process.env.CONCURRENCY||20),requests=Number(process.env.REQUESTS||200),path=process.env.LOAD_PATH||"/api/health";
let cursor=0,ok=0,failed=0;const lat=[];
async function worker(){for(;;){const i=cursor++;if(i>=requests)return;const s=performance.now();try{const r=await fetch(base+path,{redirect:"manual"});lat.push(performance.now()-s);if(r.status<500)ok++;else failed++;}catch{failed++;}}}
await Promise.all(Array.from({length:concurrency},worker));lat.sort((a,b)=>a-b);const p95=lat[Math.floor(lat.length*.95)]||0;console.log(JSON.stringify({requests,concurrency,ok,failed,p95Ms:Math.round(p95)}));if(failed>0)process.exit(1);

import { createHash } from "node:crypto";
import { createConnection } from "node:net";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { spawn } from "node:child_process";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { fileTypeFromFile } from "file-type";
import pg from "pg";
import sharp from "sharp";

const {Pool}=pg;
const DATABASE_URL=required("DATABASE_URL");
const S3_ENDPOINT=required("S3_ENDPOINT");
const S3_ACCESS_KEY_ID=required("S3_ACCESS_KEY_ID");
const S3_SECRET_ACCESS_KEY=required("S3_SECRET_ACCESS_KEY");
const S3_PRIVATE_BUCKET=required("S3_PRIVATE_BUCKET");
const S3_REGION=process.env.S3_REGION??"auto";
const CLAMAV_HOST=process.env.CLAMAV_HOST;
const CLAMAV_PORT=Number(process.env.CLAMAV_PORT??3310);
const POLL_MS=Number(process.env.WORKER_POLL_MS??1500);

const pool=new Pool({
  connectionString:DATABASE_URL,max:4,
  ssl:process.env.NODE_ENV==="production"?{rejectUnauthorized:false}:undefined
});
const s3=new S3Client({
  endpoint:S3_ENDPOINT,region:S3_REGION,forcePathStyle:true,
  credentials:{accessKeyId:S3_ACCESS_KEY_ID,secretAccessKey:S3_SECRET_ACCESS_KEY}
});

function required(name:string){
  const value=process.env[name];
  if(!value)throw new Error(name+"_MISSING");
  return value;
}
function sleep(ms:number){return new Promise(resolve=>setTimeout(resolve,ms));}
function safeError(error:unknown){return error instanceof Error?error.message.slice(0,1500):"worker failure";}

type Asset={
  id:string;object_key:string;declared_mime:string;size_bytes:number;
};

async function claimAsset():Promise<Asset|null>{
  const client=await pool.connect();
  try{
    await client.query("begin");
    const selected=await client.query<Asset>(
      `select a.id,a.object_key,a.declared_mime,a.size_bytes
       from media_assets a
       where a.status='processing'
         and exists(select 1 from media_processing_jobs j where j.asset_id=a.id and j.status='queued' and j.available_at<=now())
         and not exists(select 1 from media_processing_jobs j where j.asset_id=a.id and j.status='running')
       order by a.created_at
       for update skip locked
       limit 1`
    );
    const asset=selected.rows[0];
    if(!asset){await client.query("commit");return null;}
    await client.query(
      "update media_processing_jobs set status='running',locked_at=now(),attempts=attempts+1,updated_at=now() where asset_id=$1 and status='queued' and available_at<=now()",
      [asset.id]
    );
    await client.query("commit");
    return asset;
  }catch(error){await client.query("rollback");throw error;}finally{client.release();}
}

async function downloadObject(key:string,target:string){
  const result=await s3.send(new GetObjectCommand({Bucket:S3_PRIVATE_BUCKET,Key:key}));
  if(!result.Body)throw new Error("OBJECT_BODY_MISSING");
  await pipeline(result.Body.transformToWebStream() as ReadableStream<Uint8Array>,createWriteStream(target));
}

async function uploadFile(key:string,path:string,contentType:string){
  const info=await stat(path);
  await s3.send(new PutObjectCommand({
    Bucket:S3_PRIVATE_BUCKET,Key:key,Body:createReadStream(path),
    ContentType:contentType,ContentLength:info.size
  }));
}

async function sha256(path:string){
  const hash=createHash("sha256");
  await pipeline(createReadStream(path),async function* (source){for await(const chunk of source){hash.update(chunk);yield chunk;}}(),async function* (source){for await(const _ of source){} }());
  return hash.digest("hex");
}

async function clamavScan(path:string){
  if(!CLAMAV_HOST){
    if(process.env.NODE_ENV==="production")throw new Error("MALWARE_SCANNER_NOT_CONFIGURED");
    return;
  }
  await new Promise<void>((resolve,reject)=>{
    const socket=createConnection({host:CLAMAV_HOST,port:CLAMAV_PORT});
    const timeout=setTimeout(()=>socket.destroy(new Error("CLAMAV_TIMEOUT")),30_000);
    let response="";
    socket.on("connect",()=>{
      socket.write(Buffer.from("zINSTREAM\0"));
      const stream=createReadStream(path,{highWaterMark:64*1024});
      stream.on("data",(chunk:Buffer)=>{
        const length=Buffer.alloc(4);length.writeUInt32BE(chunk.length);
        socket.write(length);socket.write(chunk);
      });
      stream.on("end",()=>socket.write(Buffer.alloc(4)));
      stream.on("error",reject);
    });
    socket.on("data",chunk=>response+=chunk.toString("utf8"));
    socket.on("end",()=>{
      clearTimeout(timeout);
      if(response.includes(" FOUND"))reject(new Error("MALWARE_FOUND"));
      else if(response.includes(" OK"))resolve();
      else reject(new Error("CLAMAV_INVALID_RESPONSE"));
    });
    socket.on("error",error=>{clearTimeout(timeout);reject(error);});
  });
}

async function run(command:string,args:string[]){
  await new Promise<void>((resolve,reject)=>{
    const child=spawn(command,args,{stdio:["ignore","pipe","pipe"]});
    let stderr="";
    child.stderr.on("data",chunk=>stderr+=chunk.toString());
    const timer=setTimeout(()=>{child.kill("SIGKILL");reject(new Error(command.toUpperCase()+"_TIMEOUT"));},10*60_000);
    child.on("error",error=>{clearTimeout(timer);reject(error);});
    child.on("exit",code=>{
      clearTimeout(timer);
      if(code===0)resolve(); else reject(new Error(command.toUpperCase()+"_FAILED: "+stderr.slice(-900)));
    });
  });
}
async function ffprobe(path:string){
  return new Promise<{durationMs:number|null;width:number|null;height:number|null;hasVideo:boolean}>((resolve,reject)=>{
    const child=spawn("ffprobe",["-v","error","-show_streams","-show_format","-of","json",path]);
    let stdout="",stderr="";
    child.stdout.on("data",d=>stdout+=d.toString());child.stderr.on("data",d=>stderr+=d.toString());
    child.on("error",reject);
    child.on("exit",code=>{
      if(code!==0){reject(new Error("FFPROBE_FAILED: "+stderr.slice(-700)));return;}
      try{
        const data=JSON.parse(stdout) as {streams?:Array<{codec_type?:string;width?:number;height?:number;duration?:string}>;format?:{duration?:string}};
        const video=data.streams?.find(v=>v.codec_type==="video");
        const rawDuration=data.format?.duration??data.streams?.find(v=>v.duration)?.duration;
        const duration=rawDuration?Number(rawDuration):NaN;
        resolve({durationMs:Number.isFinite(duration)?Math.round(duration*1000):null,width:video?.width??null,height:video?.height??null,hasVideo:Boolean(video)});
      }catch{reject(new Error("FFPROBE_INVALID_JSON"));}
    });
  });
}

async function normalizeImage(input:string,output:string,mime:string){
  const image=sharp(input,{animated:mime==="image/gif"}).rotate();
  if(mime==="image/jpeg")await image.jpeg({quality:88,mozjpeg:true}).toFile(output);
  else if(mime==="image/png")await image.png({compressionLevel:9}).toFile(output);
  else if(mime==="image/webp")await image.webp({quality:88}).toFile(output);
  else if(mime==="image/gif")await image.gif({effort:5}).toFile(output);
  else throw new Error("UNSUPPORTED_IMAGE_MIME");
  const meta=await sharp(output,{animated:mime==="image/gif"}).metadata();
  return {width:meta.width??null,height:meta.height??null,durationMs:null as number|null,hasVideo:false};
}

async function normalizeAv(input:string,output:string,mime:string){
  if(mime==="video/mp4"){
    await run("ffmpeg",["-y","-i",input,"-map_metadata","-1","-c:v","libx264","-preset","veryfast","-crf","23","-c:a","aac","-b:a","128k","-movflags","+faststart",output]);
  }else if(mime==="video/webm"){
    await run("ffmpeg",["-y","-i",input,"-map_metadata","-1","-c:v","libvpx-vp9","-deadline","good","-cpu-used","4","-crf","32","-b:v","0","-c:a","libopus",output]);
  }else if(mime==="audio/mpeg"){
    await run("ffmpeg",["-y","-i",input,"-map_metadata","-1","-vn","-c:a","libmp3lame","-b:a","160k",output]);
  }else if(mime==="audio/mp4"){
    await run("ffmpeg",["-y","-i",input,"-map_metadata","-1","-vn","-c:a","aac","-b:a","160k","-movflags","+faststart",output]);
  }else if(mime==="audio/ogg"){
    await run("ffmpeg",["-y","-i",input,"-map_metadata","-1","-vn","-c:a","libopus","-b:a","128k",output]);
  }else throw new Error("UNSUPPORTED_AV_MIME");
  return ffprobe(output);
}

function mimeCompatible(declared:string,detected:string){
  if(declared===detected)return true;
  if(declared==="audio/mp4"&&detected==="video/mp4")return true;
  return false;
}

async function processAsset(asset:Asset){
  const dir=await mkdtemp(join(tmpdir(),"seven-media-"));
  const input=join(dir,"input.bin"),output=join(dir,"normalized.bin");
  try{
    await downloadObject(asset.object_key,input);
    const info=await stat(input);
    if(info.size!==asset.size_bytes)throw new Error("MEDIA_SIZE_MISMATCH");
    const detected=await fileTypeFromFile(input);
    if(!detected||!mimeCompatible(asset.declared_mime,detected.mime))throw new Error("MEDIA_MAGIC_BYTES_MISMATCH");

    await pool.query("update media_processing_jobs set status='done',locked_at=null,last_error=null,updated_at=now() where asset_id=$1 and type='inspect_magic_bytes'",[asset.id]);

    await clamavScan(input);
    await pool.query("update media_processing_jobs set status='done',locked_at=null,last_error=null,updated_at=now() where asset_id=$1 and type='malware_scan'",[asset.id]);

    const normalized=asset.declared_mime.startsWith("image/")
      ?await normalizeImage(input,output,asset.declared_mime)
      :await normalizeAv(input,output,asset.declared_mime);

    await pool.query("update media_processing_jobs set status='done',locked_at=null,last_error=null,updated_at=now() where asset_id=$1 and type='strip_metadata'",[asset.id]);

    if(normalized.hasVideo){
      const thumb=join(dir,"thumbnail.jpg");
      await run("ffmpeg",["-y","-ss","00:00:00.500","-i",output,"-frames:v","1","-vf","scale='min(720,iw)':-2",thumb]);
      await uploadFile(`derived/${asset.id}/thumbnail.jpg`,thumb,"image/jpeg");
    }
    await uploadFile(asset.object_key,output,asset.declared_mime);
    await pool.query("update media_processing_jobs set status='done',locked_at=null,last_error=null,updated_at=now() where asset_id=$1 and type='thumbnail_or_transcode'",[asset.id]);

    const checksum=await sha256(output);
    await pool.query(
      `update media_assets set status='ready',detected_mime=$2,checksum_sha256=$3,width=$4,height=$5,duration_ms=$6,
       moderation_status='passed',updated_at=now() where id=$1`,
      [asset.id,detected.mime,checksum,normalized.width,normalized.height,normalized.durationMs]
    );
  }catch(error){
    const message=safeError(error);
    const rejected=/MALWARE_FOUND|MAGIC_BYTES|SIZE_MISMATCH/.test(message);
    await pool.query("update media_assets set status=$2,moderation_status=$3,updated_at=now() where id=$1",[asset.id,rejected?"rejected":"failed",rejected?"rejected":"pending"]);
    await pool.query(
      "update media_processing_jobs set status='failed',locked_at=null,last_error=$2,updated_at=now() where asset_id=$1 and status='running'",
      [asset.id,message]
    );
    throw error;
  }finally{await rm(dir,{recursive:true,force:true});}
}

let stopping=false;
async function loop(){
  while(!stopping){
    try{
      const asset=await claimAsset();
      if(!asset){await sleep(POLL_MS);continue;}
      try{await processAsset(asset);}catch(error){console.error("media asset failed",asset.id,safeError(error));}
    }catch(error){console.error("worker loop error",safeError(error));await sleep(3000);}
  }
}
async function shutdown(){
  stopping=true;
  await pool.end();
  process.exit(0);
}
process.on("SIGTERM",()=>void shutdown());
process.on("SIGINT",()=>void shutdown());
void loop();

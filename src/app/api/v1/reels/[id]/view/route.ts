import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, pool } from "@/lib/db";
import { reels } from "@/db/schema";
import { getRequestSession } from "@/lib/auth";

const idSchema=z.uuid();
let tableReady:Promise<void>|null=null;

async function ensureTable(){
  tableReady??=pool.query(`
    create table if not exists reel_view_events (
      reel_id uuid not null references reels(id) on delete cascade,
      viewer_key text not null,
      created_at timestamptz not null default now(),
      primary key(reel_id,viewer_key)
    )
  `).then(()=>undefined);
  return tableReady;
}

function anonymousViewerKey(req:Request){
  const ip=(req.headers.get("x-forwarded-for")??req.headers.get("x-real-ip")??"unknown").split(",")[0].trim();
  const ua=req.headers.get("user-agent")??"unknown";
  return "anon:"+createHash("sha256").update(ip+"|"+ua).digest("hex");
}

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const {id}=await params;
    if(!idSchema.safeParse(id).success)return NextResponse.json({error:{code:"INVALID_ID",message:"Reel inválido."}},{status:422});
    const [reel]=await db.select({id:reels.id,visibility:reels.visibility}).from(reels).where(eq(reels.id,id)).limit(1);
    if(!reel||reel.visibility!=="public")return NextResponse.json({error:{code:"NOT_FOUND",message:"Reel indisponível."}},{status:404});

    await ensureTable();
    const session=await getRequestSession(req);
    const viewerKey=session?"user:"+session.userId:anonymousViewerKey(req);
    const inserted=await pool.query<{reel_id:string}>(`
      insert into reel_view_events(reel_id,viewer_key) values($1,$2)
      on conflict do nothing returning reel_id
    `,[id,viewerKey]);

    if(inserted.rowCount){
      const [updated]=await db.update(reels).set({viewCount:reels.viewCount+1}).where(eq(reels.id,id)).returning({viewCount:reels.viewCount});
      return NextResponse.json({data:{counted:true,viewCount:updated?.viewCount??1}});
    }
    const [current]=await db.select({viewCount:reels.viewCount}).from(reels).where(eq(reels.id,id)).limit(1);
    return NextResponse.json({data:{counted:false,viewCount:current?.viewCount??0}});
  }catch{
    return NextResponse.json({error:{code:"VIEW_FAILED",message:"Não foi possível registrar a visualização."}},{status:500});
  }
}

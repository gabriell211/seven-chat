import { NextResponse } from "next/server";
import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db, pool } from "@/lib/db";
import { liveBans, liveComments, liveSessions, profiles, users } from "@/db/schema";
import { requireRequestSession } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { publishRealtimeBestEffort } from "@/lib/realtime";
const schema=z.object({body:z.string().trim().min(1).max(500)});
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const result=await pool.query<{
    id:string;body:string;pinned:boolean;created_at:Date;author_id:string;
    username:string;display_name:string;is_mega_fan:boolean;
  }>(
    `select
       c.id,c.body,c.pinned,c.created_at,
       u.id as author_id,u.username,p.display_name,
       exists(
         select 1
           from fan_statuses fs
           join live_sessions l on l.id=c.live_id
          where fs.fan_user_id=c.author_id
            and fs.creator_user_id=l.host_id
            and fs.status='active'
            and fs.ends_at>now()
       ) as is_mega_fan
     from live_comments c
     join users u on u.id=c.author_id
     join profiles p on p.user_id=u.id
     where c.live_id=$1 and c.deleted_at is null
     order by c.created_at asc
     limit 300`,
    [id]
  );
  return NextResponse.json({data:result.rows.map(row=>({
    id:row.id,body:row.body,pinned:row.pinned,createdAt:row.created_at,
    authorId:row.author_id,username:row.username,displayName:row.display_name,
    isMegaFan:row.is_mega_fan
  }))});
}
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireRequestSession(req),{id}=await params,parsed=schema.safeParse(await req.json().catch(()=>null));
    if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Comentário inválido."}},{status:422});
    const [live]=await db.select({status:liveSessions.status}).from(liveSessions).where(eq(liveSessions.id,id)).limit(1);
    if(!live||live.status!=="live")return NextResponse.json({error:{code:"LIVE_INACTIVE",message:"Live indisponível."}},{status:409});
    const [ban]=await db.select({userId:liveBans.userId}).from(liveBans).where(and(eq(liveBans.liveId,id),eq(liveBans.userId,session.userId))).limit(1);
    if(ban)return NextResponse.json({error:{code:"LIVE_BANNED",message:"Você não pode comentar nesta live."}},{status:403});
    const [comment]=await db.insert(liveComments).values({liveId:id,authorId:session.userId,body:parsed.data.body}).returning({id:liveComments.id,createdAt:liveComments.createdAt});
    await publishRealtimeBestEffort({channel:"live:"+id,event:"live.comment.created",data:{id:comment.id,userId:session.userId,body:parsed.data.body,createdAt:comment.createdAt}});
    return NextResponse.json({data:comment},{status:201});
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}
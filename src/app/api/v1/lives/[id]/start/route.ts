import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { liveSessions } from "@/db/schema";
import { requireRequestSession } from "@/lib/auth";
import { publishRealtimeBestEffort } from "@/lib/realtime";

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireRequestSession(req),{id}=await params;
    const changed=await db.update(liveSessions).set({status:"live",startedAt:new Date()})
      .where(and(eq(liveSessions.id,id),eq(liveSessions.hostId,session.userId),eq(liveSessions.status,"created")))
      .returning({id:liveSessions.id});
    if(!changed.length)return NextResponse.json({error:{code:"LIVE_START_FORBIDDEN",message:"Não foi possível iniciar a live."}},{status:409});
    await publishRealtimeBestEffort({channel:"user:"+session.userId,event:"live.started",data:{liveId:id}});
    return NextResponse.json({data:{id,status:"live"}});
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}
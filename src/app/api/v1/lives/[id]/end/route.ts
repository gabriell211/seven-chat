import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { liveSessions } from "@/db/schema";
import { requireRequestSession } from "@/lib/auth";
import { publishRealtimeBestEffort } from "@/lib/realtime";

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireRequestSession(req),{id}=await params;
    const changed=await db.update(liveSessions).set({status:"ended",endedAt:new Date()})
      .where(and(eq(liveSessions.id,id),eq(liveSessions.hostId,session.userId)))
      .returning({id:liveSessions.id});
    if(!changed.length)return NextResponse.json({error:{code:"LIVE_END_FORBIDDEN",message:"Não foi possível encerrar a live."}},{status:403});
    await publishRealtimeBestEffort({channel:"live:"+id,event:"live.ended",data:{hostId:session.userId}});
    return NextResponse.json({data:{id,status:"ended"}});
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}
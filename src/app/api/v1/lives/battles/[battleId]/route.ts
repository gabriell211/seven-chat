import { NextResponse } from "next/server";
import { and, eq, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { liveBattles, liveSessions } from "@/db/schema";
import { requireRequestSession } from "@/lib/auth";
import { publishRealtimeBestEffort } from "@/lib/realtime";
const schema=z.object({action:z.enum(["accept","reject","end"])});

export async function GET(_:Request,{params}:{params:Promise<{battleId:string}>}){
  const {battleId}=await params;
  const [battle]=await db.select().from(liveBattles).where(eq(liveBattles.id,battleId)).limit(1);
  if(!battle)return NextResponse.json({error:{code:"NOT_FOUND",message:"Batalha não encontrada."}},{status:404});
  return NextResponse.json({data:battle});
}

export async function PATCH(req:Request,{params}:{params:Promise<{battleId:string}>}){
  try{
    const session=await requireRequestSession(req),{battleId}=await params,parsed=schema.safeParse(await req.json().catch(()=>null));
    if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Ação inválida."}},{status:422});
    const [battle]=await db.select().from(liveBattles).where(eq(liveBattles.id,battleId)).limit(1);
    if(!battle)return NextResponse.json({error:{code:"NOT_FOUND",message:"Batalha não encontrada."}},{status:404});
    const lives=await db.select({id:liveSessions.id,hostId:liveSessions.hostId,status:liveSessions.status}).from(liveSessions)
      .where(or(eq(liveSessions.id,battle.liveAId),eq(liveSessions.id,battle.liveBId)));
    const a=lives.find(v=>v.id===battle.liveAId),b=lives.find(v=>v.id===battle.liveBId);
    if(!a||!b)return NextResponse.json({error:{code:"LIVE_NOT_FOUND",message:"Uma live da batalha não existe."}},{status:404});
    if(parsed.data.action==="accept"){
      if(session.userId!==b.hostId||battle.status!=="invited"||a.status!=="live"||b.status!=="live")return NextResponse.json({error:{code:"BATTLE_ACCEPT_FORBIDDEN",message:"Não é possível aceitar esta batalha."}},{status:403});
      const now=new Date(),endsAt=new Date(now.getTime()+battle.durationSeconds*1000);
      const [updated]=await db.update(liveBattles).set({status:"active",startsAt:now,endsAt,scoreA:0,scoreB:0,winnerLiveId:null})
        .where(and(eq(liveBattles.id,battleId),eq(liveBattles.status,"invited"))).returning();
      if(!updated)return NextResponse.json({error:{code:"BATTLE_STATE_CHANGED",message:"A batalha mudou de estado."}},{status:409});
      await publishRealtimeBestEffort({channel:"live:"+battle.liveAId,event:"live.battle.started",data:{battleId,liveAId:battle.liveAId,liveBId:battle.liveBId,endsAt}});
      await publishRealtimeBestEffort({channel:"live:"+battle.liveBId,event:"live.battle.started",data:{battleId,liveAId:battle.liveAId,liveBId:battle.liveBId,endsAt}});
      return NextResponse.json({data:updated});
    }
    if(parsed.data.action==="reject"){
      if(session.userId!==b.hostId||battle.status!=="invited")return NextResponse.json({error:{code:"BATTLE_REJECT_FORBIDDEN",message:"Não é possível recusar esta batalha."}},{status:403});
      await db.update(liveBattles).set({status:"rejected",endsAt:new Date()}).where(and(eq(liveBattles.id,battleId),eq(liveBattles.status,"invited")));
      return NextResponse.json({data:{status:"rejected"}});
    }
    if(![a.hostId,b.hostId].includes(session.userId)||battle.status!=="active")return NextResponse.json({error:{code:"BATTLE_END_FORBIDDEN",message:"Não é possível encerrar esta batalha."}},{status:403});
    const winner=battle.scoreA===battle.scoreB?null:battle.scoreA>battle.scoreB?battle.liveAId:battle.liveBId;
    await db.update(liveBattles).set({status:"ended",endsAt:new Date(),winnerLiveId:winner}).where(and(eq(liveBattles.id,battleId),eq(liveBattles.status,"active")));
    await publishRealtimeBestEffort({channel:"live:"+battle.liveAId,event:"live.battle.ended",data:{battleId,scoreA:battle.scoreA,scoreB:battle.scoreB,winnerLiveId:winner}});
    await publishRealtimeBestEffort({channel:"live:"+battle.liveBId,event:"live.battle.ended",data:{battleId,scoreA:battle.scoreA,scoreB:battle.scoreB,winnerLiveId:winner}});
    return NextResponse.json({data:{status:"ended",scoreA:battle.scoreA,scoreB:battle.scoreB,winnerLiveId:winner}});
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}
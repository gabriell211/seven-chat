import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { liveBattles, liveSessions, notifications, profiles, users } from "@/db/schema";
import { requireRequestSession } from "@/lib/auth";
import { publishRealtimeBestEffort } from "@/lib/realtime";

const schema=z.object({opponentLiveId:z.uuid(),durationSeconds:z.number().int().min(60).max(600).default(180)});

export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    await requireRequestSession(req);
    const {id}=await params;
    const [battle]=await db.select().from(liveBattles)
      .where(and(inArray(liveBattles.status,["invited","active"]),or(eq(liveBattles.liveAId,id),eq(liveBattles.liveBId,id))))
      .orderBy(desc(liveBattles.createdAt)).limit(1);
    if(!battle)return NextResponse.json({data:null});

    const lives=await db.select({
      id:liveSessions.id,hostId:liveSessions.hostId,title:liveSessions.title,
      username:users.username,displayName:profiles.displayName
    }).from(liveSessions)
      .innerJoin(users,eq(liveSessions.hostId,users.id))
      .innerJoin(profiles,eq(users.id,profiles.userId))
      .where(inArray(liveSessions.id,[battle.liveAId,battle.liveBId]));

    return NextResponse.json({data:{...battle,lives}});
  }catch{
    return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});
  }
}

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireRequestSession(req),{id}=await params,parsed=schema.safeParse(await req.json().catch(()=>null));
    if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Batalha inválida."}},{status:422});
    if(parsed.data.opponentLiveId===id)return NextResponse.json({error:{code:"SAME_LIVE",message:"Escolha outra live."}},{status:422});
    const lives=await db.select({id:liveSessions.id,hostId:liveSessions.hostId,status:liveSessions.status}).from(liveSessions)
      .where(inArray(liveSessions.id,[id,parsed.data.opponentLiveId]));
    const own=lives.find(v=>v.id===id),other=lives.find(v=>v.id===parsed.data.opponentLiveId);
    if(!own||own.hostId!==session.userId||own.status!=="live")return NextResponse.json({error:{code:"HOST_ONLY",message:"Somente o host de uma live ativa inicia batalha."}},{status:403});
    if(!other||other.status!=="live")return NextResponse.json({error:{code:"OPPONENT_UNAVAILABLE",message:"Live adversária indisponível."}},{status:404});
    const conflict=await db.select({id:liveBattles.id}).from(liveBattles).where(and(
      inArray(liveBattles.status,["invited","active"]),
      or(eq(liveBattles.liveAId,id),eq(liveBattles.liveBId,id),eq(liveBattles.liveAId,other.id),eq(liveBattles.liveBId,other.id))
    )).limit(1);
    if(conflict.length)return NextResponse.json({error:{code:"BATTLE_ALREADY_ACTIVE",message:"Uma das lives já está em batalha."}},{status:409});
    const battleId=randomUUID();
    await db.transaction(async tx=>{
      await tx.insert(liveBattles).values({id:battleId,liveAId:id,liveBId:other.id,invitedBy:session.userId,status:"invited",durationSeconds:parsed.data.durationSeconds});
      await tx.insert(notifications).values({userId:other.hostId,actorId:session.userId,type:"live_battle_invite",entityType:"live",entityId:id,payload:{battleId,opponentLiveId:id}});
    });
    await publishRealtimeBestEffort({channel:"user:"+other.hostId,event:"live.battle.invited",data:{battleId,liveAId:id,liveBId:other.id,durationSeconds:parsed.data.durationSeconds}});
    await publishRealtimeBestEffort({channel:"live:"+id,event:"live.battle.invited",data:{battleId,liveAId:id,liveBId:other.id,durationSeconds:parsed.data.durationSeconds}});
    return NextResponse.json({data:{battleId,status:"invited"}},{status:201});
  }catch{
    return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});
  }
}

import { NextResponse } from "next/server";
import { and, lte, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { liveBattles } from "@/db/schema";
import { publishRealtimeBestEffort } from "@/lib/realtime";

export async function POST(req:Request){
  if(req.headers.get("authorization")!=="Bearer "+process.env.CRON_SECRET)return NextResponse.json({error:{code:"FORBIDDEN",message:"Forbidden"}},{status:403});
  const due=await db.select().from(liveBattles).where(and(eq(liveBattles.status,"active"),lte(liveBattles.endsAt,new Date()))).limit(100);
  let ended=0;
  for(const battle of due){
    const winner=battle.scoreA===battle.scoreB?null:battle.scoreA>battle.scoreB?battle.liveAId:battle.liveBId;
    const changed=await db.update(liveBattles).set({status:"ended",winnerLiveId:winner})
      .where(and(eq(liveBattles.id,battle.id),eq(liveBattles.status,"active"))).returning({id:liveBattles.id});
    if(!changed.length)continue;
    ended++;
    const data={battleId:battle.id,scoreA:battle.scoreA,scoreB:battle.scoreB,winnerLiveId:winner};
    await publishRealtimeBestEffort({channel:"live:"+battle.liveAId,event:"live.battle.ended",data});
    await publishRealtimeBestEffort({channel:"live:"+battle.liveBId,event:"live.battle.ended",data});
  }
  return NextResponse.json({data:{ended}});
}
import { NextResponse } from "next/server";
import { and, eq, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { liveBattles, liveSessions, rooms } from "@/db/schema";
import { requireRequestSession } from "@/lib/auth";
import { publishRealtimeBestEffort } from "@/lib/realtime";
import { GiftError, sendGift } from "@/services/gifts";
import { areUsersBlocked } from "@/services/social-guard";

const base={giftId:z.uuid(),quantity:z.number().int().min(1).max(100).default(1),idempotencyKey:z.string().min(16).max(128)};
const schema=z.discriminatedUnion("contextType",[
  z.object({...base,contextType:z.literal("profile"),receiverId:z.uuid()}),
  z.object({...base,contextType:z.literal("live"),liveId:z.uuid()}),
  z.object({...base,contextType:z.literal("room"),roomId:z.uuid()})
]);

export async function POST(req:Request){
  try{
    const session=await requireRequestSession(req);
    const parsed=schema.safeParse(await req.json().catch(()=>null));
    if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Dados do gift inválidos."}},{status:422});
    let receiverId:string,contextType:"live"|"room"|undefined,contextId:string|undefined;
    if(parsed.data.contextType==="profile"){
      receiverId=parsed.data.receiverId;
    }else if(parsed.data.contextType==="live"){
      const [live]=await db.select({hostId:liveSessions.hostId}).from(liveSessions)
        .where(and(eq(liveSessions.id,parsed.data.liveId),eq(liveSessions.status,"live"))).limit(1);
      if(!live)return NextResponse.json({error:{code:"LIVE_NOT_FOUND",message:"Live indisponível."}},{status:404});
      receiverId=live.hostId;contextType="live";contextId=parsed.data.liveId;
    }else{
      const [room]=await db.select({hostId:rooms.hostId}).from(rooms)
        .where(and(eq(rooms.id,parsed.data.roomId),eq(rooms.status,"active"))).limit(1);
      if(!room)return NextResponse.json({error:{code:"ROOM_NOT_FOUND",message:"Sala indisponível."}},{status:404});
      receiverId=room.hostId;contextType="room";contextId=parsed.data.roomId;
    }
    if(await areUsersBlocked(session.userId,receiverId))return NextResponse.json({error:{code:"BLOCKED",message:"Gift indisponível."}},{status:403});
    const data=await sendGift({
      senderId:session.userId,receiverId,giftId:parsed.data.giftId,quantity:parsed.data.quantity,
      idempotencyKey:parsed.data.idempotencyKey,contextType,contextId
    });
    const channel=contextType&&contextId?contextType+":"+contextId:"user:"+receiverId;
    await publishRealtimeBestEffort({channel,event:contextType==="live"?"live.gift.received":contextType==="room"?"room.gift.received":"notification.created",data:{senderId:session.userId,receiverId,giftId:parsed.data.giftId,quantity:parsed.data.quantity,transactionId:data.transactionId}});
    if(contextType==="live"&&contextId){
      const [battle]=await db.select({id:liveBattles.id,liveAId:liveBattles.liveAId,liveBId:liveBattles.liveBId,scoreA:liveBattles.scoreA,scoreB:liveBattles.scoreB,endsAt:liveBattles.endsAt})
        .from(liveBattles).where(and(eq(liveBattles.status,"active"),or(eq(liveBattles.liveAId,contextId),eq(liveBattles.liveBId,contextId)))).limit(1);
      if(battle){
        const payload={battleId:battle.id,scoreA:battle.scoreA,scoreB:battle.scoreB,endsAt:battle.endsAt};
        await publishRealtimeBestEffort({channel:"live:"+battle.liveAId,event:"live.battle.updated",data:payload});
        await publishRealtimeBestEffort({channel:"live:"+battle.liveBId,event:"live.battle.updated",data:payload});
      }
    }
    return NextResponse.json({data},{status:201});
  }catch(error){
    if(error instanceof GiftError)return NextResponse.json({error:{code:error.code,message:error.message}},{status:["GIFT_INSUFFICIENT_BALANCE","GIFT_RETRY"].includes(error.code)?409:422});
    return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});
  }
}
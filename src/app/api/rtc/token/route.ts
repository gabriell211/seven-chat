import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { calls, conversationMembers, liveGuests, liveSessions, roomMembers, rooms } from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { createRtcToken } from "@/lib/rtc";

const schema=z.discriminatedUnion("resourceType",[
  z.object({resourceType:z.literal("room"),resourceId:z.uuid()}),
  z.object({resourceType:z.literal("live"),resourceId:z.uuid()}),
  z.object({resourceType:z.literal("call"),resourceId:z.uuid()})
]);

export async function POST(req:Request){
  try{
    const session=await requireSession();
    const parsed=schema.safeParse(await req.json());
    if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Recurso RTC inválido."}},{status:422});
    let roomName:string|undefined;
    let canPublish=false;
    if(parsed.data.resourceType==="room"){
      const [row]=await db.select({rtc:rooms.rtcRoomName,role:roomMembers.role,status:rooms.status}).from(roomMembers)
        .innerJoin(rooms,eq(roomMembers.roomId,rooms.id))
        .where(and(eq(roomMembers.roomId,parsed.data.resourceId),eq(roomMembers.userId,session.userId))).limit(1);
      if(!row||row.status!=="active")return NextResponse.json({error:{code:"FORBIDDEN",message:"Sem acesso à sala."}},{status:403});
      roomName=row.rtc; canPublish=["host","cohost","moderator","speaker"].includes(row.role);
    }else if(parsed.data.resourceType==="live"){
      const [live]=await db.select({rtc:liveSessions.rtcRoomName,hostId:liveSessions.hostId,status:liveSessions.status}).from(liveSessions)
        .where(eq(liveSessions.id,parsed.data.resourceId)).limit(1);
      if(!live||!["created","live"].includes(live.status))return NextResponse.json({error:{code:"NOT_FOUND",message:"Live indisponível."}},{status:404});
      roomName=live.rtc;
      canPublish=live.hostId===session.userId;
      if(!canPublish){
        const [guest]=await db.select({status:liveGuests.status}).from(liveGuests)
          .where(and(eq(liveGuests.liveId,parsed.data.resourceId),eq(liveGuests.userId,session.userId))).limit(1);
        canPublish=guest?.status==="accepted";
      }
    }else{
      const [call]=await db.select({rtc:calls.rtcRoomName,conversationId:calls.conversationId,status:calls.status}).from(calls)
        .where(eq(calls.id,parsed.data.resourceId)).limit(1);
      if(!call||!call.conversationId||["ended","missed","rejected","failed"].includes(call.status))return NextResponse.json({error:{code:"NOT_FOUND",message:"Chamada indisponível."}},{status:404});
      const [member]=await db.select({userId:conversationMembers.userId}).from(conversationMembers)
        .where(and(eq(conversationMembers.conversationId,call.conversationId),eq(conversationMembers.userId,session.userId))).limit(1);
      if(!member)return NextResponse.json({error:{code:"FORBIDDEN",message:"Sem acesso à chamada."}},{status:403});
      roomName=call.rtc; canPublish=true;
    }
    const rtc=await createRtcToken({room:roomName,identity:session.userId,canPublish,canSubscribe:true});
    return NextResponse.json({data:rtc});
  }catch(error){
    if(error instanceof Error&&error.message==="RTC_NOT_CONFIGURED")return NextResponse.json({error:{code:"RTC_NOT_CONFIGURED",message:"RTC ainda não foi provisionado."}},{status:503});
    return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});
  }
}
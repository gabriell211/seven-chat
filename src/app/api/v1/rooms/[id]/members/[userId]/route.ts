import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { roomMembers, rooms } from "@/db/schema";
import { requireRequestSession } from "@/lib/auth";
import { publishRealtimeBestEffort } from "@/lib/realtime";

const schema=z.object({action:z.enum(["speaker","listener","moderator","mute","unmute","kick","ban"])});
export async function PATCH(req:Request,{params}:{params:Promise<{id:string;userId:string}>}){
  try{
    const session=await requireRequestSession(req),{id,userId}=await params,parsed=schema.safeParse(await req.json().catch(()=>null));
    if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Ação inválida."}},{status:422});
    const [room]=await db.select({hostId:rooms.hostId,stageLimit:rooms.stageLimit,status:rooms.status}).from(rooms).where(eq(rooms.id,id)).limit(1);
    if(!room||room.status!=="active")return NextResponse.json({error:{code:"NOT_FOUND",message:"Sala indisponível."}},{status:404});
    const [actor]=await db.select({role:roomMembers.role}).from(roomMembers).where(and(eq(roomMembers.roomId,id),eq(roomMembers.userId,session.userId))).limit(1);
    const isHost=room.hostId===session.userId;
    if(!isHost&&!["moderator","cohost"].includes(actor?.role??""))return NextResponse.json({error:{code:"FORBIDDEN",message:"Sem permissão para moderar."}},{status:403});
    if(userId===room.hostId)return NextResponse.json({error:{code:"HOST_PROTECTED",message:"O host não pode ser removido ou rebaixado."}},{status:403});
    if(parsed.data.action==="speaker"){
      const stage=await db.select({userId:roomMembers.userId}).from(roomMembers).where(and(eq(roomMembers.roomId,id),inArray(roomMembers.role,["host","cohost","speaker"])));
      if(stage.length>=room.stageLimit)return NextResponse.json({error:{code:"STAGE_FULL",message:"O palco atingiu o limite."}},{status:409});
      await db.update(roomMembers).set({role:"speaker",muted:false}).where(and(eq(roomMembers.roomId,id),eq(roomMembers.userId,userId)));
    }else if(parsed.data.action==="listener"){
      await db.update(roomMembers).set({role:"listener",muted:false}).where(and(eq(roomMembers.roomId,id),eq(roomMembers.userId,userId)));
    }else if(parsed.data.action==="moderator"){
      if(!isHost)return NextResponse.json({error:{code:"HOST_ONLY",message:"Somente o host define moderadores."}},{status:403});
      await db.update(roomMembers).set({role:"moderator"}).where(and(eq(roomMembers.roomId,id),eq(roomMembers.userId,userId)));
    }else if(parsed.data.action==="mute"||parsed.data.action==="unmute"){
      await db.update(roomMembers).set({muted:parsed.data.action==="mute"}).where(and(eq(roomMembers.roomId,id),eq(roomMembers.userId,userId)));
    }else if(parsed.data.action==="kick"){
      await db.delete(roomMembers).where(and(eq(roomMembers.roomId,id),eq(roomMembers.userId,userId)));
    }else{
      await db.update(roomMembers).set({role:"banned",muted:true}).where(and(eq(roomMembers.roomId,id),eq(roomMembers.userId,userId)));
    }
    await publishRealtimeBestEffort({channel:"room:"+id,event:"room.stage.updated",data:{userId,action:parsed.data.action,actorId:session.userId}});
    return NextResponse.json({data:{updated:true}});
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}
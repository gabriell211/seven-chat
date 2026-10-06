import { NextResponse } from "next/server";
import { and, count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { liveGuests, liveSessions } from "@/db/schema";
import { requireRequestSession } from "@/lib/auth";
import { publishRealtimeBestEffort } from "@/lib/realtime";

async function hostFor(liveId:string,userId:string){
  const [live]=await db.select({hostId:liveSessions.hostId,status:liveSessions.status}).from(liveSessions).where(eq(liveSessions.id,liveId)).limit(1);
  return live&&live.hostId===userId&&["created","live"].includes(live.status)?live:null;
}

export async function PUT(req:Request,{params}:{params:Promise<{id:string;userId:string}>}){
  try{
    const session=await requireRequestSession(req),{id,userId}=await params;
    if(!await hostFor(id,session.userId))return NextResponse.json({error:{code:"FORBIDDEN",message:"Somente o host aceita participantes."}},{status:403});
    const [slots]=await db.select({value:count()}).from(liveGuests).where(and(eq(liveGuests.liveId,id),eq(liveGuests.status,"accepted")));
    if(slots.value>=4)return NextResponse.json({error:{code:"LIVE_GUEST_LIMIT",message:"A live já tem 4 convidados conectados."}},{status:409});
    const changed=await db.update(liveGuests).set({status:"accepted",joinedAt:new Date()})
      .where(and(eq(liveGuests.liveId,id),eq(liveGuests.userId,userId),eq(liveGuests.status,"requested")))
      .returning({userId:liveGuests.userId});
    if(!changed.length)return NextResponse.json({error:{code:"REQUEST_NOT_FOUND",message:"Pedido de participação não encontrado."}},{status:404});
    await publishRealtimeBestEffort({channel:"live:"+id,event:"live.guest.accepted",data:{userId,hostId:session.userId}});
    await publishRealtimeBestEffort({channel:"user:"+userId,event:"live.guest.accepted",data:{liveId:id,hostId:session.userId}});
    return NextResponse.json({data:{status:"accepted"}});
  }catch{
    return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});
  }
}

export async function DELETE(req:Request,{params}:{params:Promise<{id:string;userId:string}>}){
  try{
    const session=await requireRequestSession(req),{id,userId}=await params;
    if(!await hostFor(id,session.userId))return NextResponse.json({error:{code:"FORBIDDEN",message:"Somente o host remove convidados."}},{status:403});
    await db.update(liveGuests).set({status:"removed"}).where(and(eq(liveGuests.liveId,id),eq(liveGuests.userId,userId)));
    await publishRealtimeBestEffort({channel:"live:"+id,event:"live.guest.removed",data:{userId,hostId:session.userId}});
    await publishRealtimeBestEffort({channel:"user:"+userId,event:"live.guest.removed",data:{liveId:id,hostId:session.userId}});
    return NextResponse.json({data:{removed:true}});
  }catch{
    return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});
  }
}

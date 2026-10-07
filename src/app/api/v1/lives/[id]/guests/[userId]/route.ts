import { NextResponse } from "next/server";
import { and, count, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { liveGuests, liveSessions, notifications } from "@/db/schema";
import { requireRequestSession } from "@/lib/auth";
import { publishRealtimeBestEffort } from "@/lib/realtime";

const actionSchema=z.object({action:z.enum(["accept","reject"])});

async function requireHost(liveId:string,userId:string){
  const [live]=await db.select({hostId:liveSessions.hostId,status:liveSessions.status})
    .from(liveSessions).where(eq(liveSessions.id,liveId)).limit(1);
  return live&&live.hostId===userId&&["created","live"].includes(live.status)?live:null;
}

export async function PATCH(req:Request,{params}:{params:Promise<{id:string;userId:string}>}){
  try{
    const session=await requireRequestSession(req),{id,userId}=await params;
    const live=await requireHost(id,session.userId);
    if(!live)return NextResponse.json({error:{code:"HOST_ONLY",message:"Somente o host gerencia pedidos."}},{status:403});
    const parsed=actionSchema.safeParse(await req.json().catch(()=>null));
    if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Ação inválida."}},{status:422});
    const [guest]=await db.select({status:liveGuests.status})
      .from(liveGuests).where(and(eq(liveGuests.liveId,id),eq(liveGuests.userId,userId))).limit(1);
    if(!guest||guest.status!=="requested")return NextResponse.json({error:{code:"REQUEST_NOT_FOUND",message:"Pedido não encontrado."}},{status:404});

    if(parsed.data.action==="accept"){
      const [accepted]=await db.select({value:count()}).from(liveGuests).where(and(eq(liveGuests.liveId,id),eq(liveGuests.status,"accepted")));
      if(accepted.value>=4)return NextResponse.json({error:{code:"LIVE_GUEST_LIMIT",message:"Não há mais vagas de convidado."}},{status:409});
      await db.update(liveGuests).set({status:"accepted",joinedAt:new Date()})
        .where(and(eq(liveGuests.liveId,id),eq(liveGuests.userId,userId)));
      await db.insert(notifications).values({userId,actorId:session.userId,type:"live_guest_accepted",entityType:"live",entityId:id});
      await publishRealtimeBestEffort({channel:"live:"+id,event:"live.guest.accepted",data:{userId,hostId:session.userId}});
      return NextResponse.json({data:{status:"accepted"}});
    }

    await db.update(liveGuests).set({status:"rejected",joinedAt:null})
      .where(and(eq(liveGuests.liveId,id),eq(liveGuests.userId,userId)));
    await db.insert(notifications).values({userId,actorId:session.userId,type:"live_guest_rejected",entityType:"live",entityId:id});
    await publishRealtimeBestEffort({channel:"live:"+id,event:"live.guest.rejected",data:{userId,hostId:session.userId}});
    return NextResponse.json({data:{status:"rejected"}});
  }catch{
    return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});
  }
}

export async function DELETE(req:Request,{params}:{params:Promise<{id:string;userId:string}>}){
  try{
    const session=await requireRequestSession(req),{id,userId}=await params;
    const live=await requireHost(id,session.userId);
    if(!live)return NextResponse.json({error:{code:"FORBIDDEN",message:"Somente o host remove convidados."}},{status:403});
    await db.update(liveGuests).set({status:"removed",joinedAt:null}).where(and(eq(liveGuests.liveId,id),eq(liveGuests.userId,userId)));
    await publishRealtimeBestEffort({channel:"live:"+id,event:"live.guest.removed",data:{userId,hostId:session.userId}});
    return NextResponse.json({data:{removed:true}});
  }catch{
    return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});
  }
}
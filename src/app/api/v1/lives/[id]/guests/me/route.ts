import { NextResponse } from "next/server";
import { and, count, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { liveGuests, liveSessions } from "@/db/schema";
import { requireRequestSession } from "@/lib/auth";
import { publishRealtimeBestEffort } from "@/lib/realtime";

const schema=z.object({action:z.enum(["accept","reject","leave","cancel_request"])});

export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireRequestSession(req),{id}=await params;
    const [guest]=await db.select({status:liveGuests.status,role:liveGuests.role,joinedAt:liveGuests.joinedAt})
      .from(liveGuests)
      .where(and(eq(liveGuests.liveId,id),eq(liveGuests.userId,session.userId)))
      .limit(1);
    return NextResponse.json({data:guest??null});
  }catch{
    return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});
  }
}

export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireRequestSession(req),{id}=await params,parsed=schema.safeParse(await req.json().catch(()=>null));
    if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Ação inválida."}},{status:422});
    const [live]=await db.select({status:liveSessions.status}).from(liveSessions).where(eq(liveSessions.id,id)).limit(1);
    if(!live||!["created","live"].includes(live.status))return NextResponse.json({error:{code:"LIVE_INACTIVE",message:"Live indisponível."}},{status:409});
    const [guest]=await db.select({status:liveGuests.status}).from(liveGuests).where(and(eq(liveGuests.liveId,id),eq(liveGuests.userId,session.userId))).limit(1);
    if(!guest)return NextResponse.json({error:{code:"INVITE_NOT_FOUND",message:"Convite ou pedido não encontrado."}},{status:404});

    if(parsed.data.action==="accept"){
      if(guest.status!=="invited")return NextResponse.json({error:{code:"INVITE_REQUIRED",message:"Não há convite pendente para aceitar."}},{status:409});
      const [accepted]=await db.select({value:count()}).from(liveGuests).where(and(eq(liveGuests.liveId,id),eq(liveGuests.status,"accepted")));
      if(accepted.value>=4)return NextResponse.json({error:{code:"LIVE_GUEST_LIMIT",message:"Não há mais vagas de convidado."}},{status:409});
      await db.update(liveGuests).set({status:"accepted",joinedAt:new Date()}).where(and(eq(liveGuests.liveId,id),eq(liveGuests.userId,session.userId)));
      await publishRealtimeBestEffort({channel:"live:"+id,event:"live.guest.accepted",data:{userId:session.userId}});
      return NextResponse.json({data:{status:"accepted"}});
    }

    if(parsed.data.action==="cancel_request"){
      if(guest.status!=="requested")return NextResponse.json({error:{code:"REQUEST_REQUIRED",message:"Não há pedido pendente."}},{status:409});
      await db.update(liveGuests).set({status:"cancelled",joinedAt:null}).where(and(eq(liveGuests.liveId,id),eq(liveGuests.userId,session.userId)));
      await publishRealtimeBestEffort({channel:"live:"+id,event:"live.guest.cancelled",data:{userId:session.userId}});
      return NextResponse.json({data:{status:"cancelled"}});
    }

    const status=parsed.data.action==="reject"?"rejected":"left";
    await db.update(liveGuests).set({status,joinedAt:null}).where(and(eq(liveGuests.liveId,id),eq(liveGuests.userId,session.userId)));
    await publishRealtimeBestEffort({channel:"live:"+id,event:"live.guest."+status,data:{userId:session.userId}});
    return NextResponse.json({data:{status}});
  }catch{
    return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});
  }
}
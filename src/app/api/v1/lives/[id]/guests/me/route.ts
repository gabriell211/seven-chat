import { NextResponse } from "next/server";
import { and, count, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { liveGuests, liveSessions } from "@/db/schema";
import { requireRequestSession } from "@/lib/auth";
import { publishRealtimeBestEffort } from "@/lib/realtime";
const schema=z.object({action:z.enum(["accept","reject","leave"])});
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireRequestSession(req),{id}=await params,parsed=schema.safeParse(await req.json().catch(()=>null));
    if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Ação inválida."}},{status:422});
    const [live]=await db.select({status:liveSessions.status}).from(liveSessions).where(eq(liveSessions.id,id)).limit(1);
    if(!live||!["created","live"].includes(live.status))return NextResponse.json({error:{code:"LIVE_INACTIVE",message:"Live indisponível."}},{status:409});
    const [guest]=await db.select({status:liveGuests.status}).from(liveGuests).where(and(eq(liveGuests.liveId,id),eq(liveGuests.userId,session.userId))).limit(1);
    if(!guest)return NextResponse.json({error:{code:"INVITE_NOT_FOUND",message:"Convite não encontrado."}},{status:404});
    if(parsed.data.action==="accept"){
      const [accepted]=await db.select({value:count()}).from(liveGuests).where(and(eq(liveGuests.liveId,id),eq(liveGuests.status,"accepted")));
      if(accepted.value>=4)return NextResponse.json({error:{code:"LIVE_GUEST_LIMIT",message:"Não há mais vagas de convidado."}},{status:409});
      await db.update(liveGuests).set({status:"accepted",joinedAt:new Date()}).where(and(eq(liveGuests.liveId,id),eq(liveGuests.userId,session.userId)));
      await publishRealtimeBestEffort({channel:"live:"+id,event:"live.guest.accepted",data:{userId:session.userId}});
      return NextResponse.json({data:{status:"accepted"}});
    }
    const status=parsed.data.action==="reject"?"rejected":"left";
    await db.update(liveGuests).set({status}).where(and(eq(liveGuests.liveId,id),eq(liveGuests.userId,session.userId)));
    await publishRealtimeBestEffort({channel:"live:"+id,event:"live.guest."+status,data:{userId:session.userId}});
    return NextResponse.json({data:{status}});
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}
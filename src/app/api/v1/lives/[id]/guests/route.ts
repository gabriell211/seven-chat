import { NextResponse } from "next/server";
import { and, count, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { liveGuests, liveSessions, notifications, profiles, users } from "@/db/schema";
import { requireRequestSession } from "@/lib/auth";
import { publishRealtimeBestEffort } from "@/lib/realtime";
import { areUsersBlocked } from "@/services/social-guard";

const schema=z.object({userId:z.uuid()});

export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireRequestSession(req),{id}=await params;
    const [live]=await db.select({hostId:liveSessions.hostId}).from(liveSessions).where(eq(liveSessions.id,id)).limit(1);
    if(!live||live.hostId!==session.userId)return NextResponse.json({error:{code:"HOST_ONLY",message:"Somente o host vê pedidos e convidados."}},{status:403});
    const data=await db.select({
      userId:users.id,username:users.username,displayName:profiles.displayName,
      status:liveGuests.status,role:liveGuests.role,joinedAt:liveGuests.joinedAt
    }).from(liveGuests)
      .innerJoin(users,eq(liveGuests.userId,users.id))
      .innerJoin(profiles,eq(users.id,profiles.userId))
      .where(eq(liveGuests.liveId,id));
    return NextResponse.json({data});
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireRequestSession(req),{id}=await params,parsed=schema.safeParse(await req.json().catch(()=>null));
    if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Convidado inválido."}},{status:422});
    const [live]=await db.select({hostId:liveSessions.hostId,status:liveSessions.status}).from(liveSessions).where(eq(liveSessions.id,id)).limit(1);
    if(!live||live.hostId!==session.userId||!["created","live"].includes(live.status))return NextResponse.json({error:{code:"FORBIDDEN",message:"Sem permissão para convidar."}},{status:403});
    if(parsed.data.userId===session.userId)return NextResponse.json({error:{code:"SELF_INVITE",message:"O host já participa da live."}},{status:422});
    if(await areUsersBlocked(session.userId,parsed.data.userId))return NextResponse.json({error:{code:"BLOCKED",message:"Convite indisponível."}},{status:403});
    const [target]=await db.select({id:users.id}).from(users).where(and(eq(users.id,parsed.data.userId),eq(users.status,"active"))).limit(1);
    if(!target)return NextResponse.json({error:{code:"USER_NOT_FOUND",message:"Usuário indisponível."}},{status:404});
    const [slots]=await db.select({value:count()}).from(liveGuests).where(and(eq(liveGuests.liveId,id),inArray(liveGuests.status,["invited","accepted"])));
    if(slots.value>=4)return NextResponse.json({error:{code:"LIVE_GUEST_LIMIT",message:"A live já tem 4 vagas reservadas."}},{status:409});
    await db.insert(liveGuests).values({liveId:id,userId:parsed.data.userId,role:"guest",status:"invited"})
      .onConflictDoUpdate({target:[liveGuests.liveId,liveGuests.userId],set:{status:"invited",role:"guest",joinedAt:null}});
    await db.insert(notifications).values({userId:parsed.data.userId,actorId:session.userId,type:"live_guest_invite",entityType:"live",entityId:id});
    await publishRealtimeBestEffort({channel:"user:"+parsed.data.userId,event:"live.guest.invited",data:{liveId:id,hostId:session.userId}});
    return NextResponse.json({data:{invited:true}});
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}
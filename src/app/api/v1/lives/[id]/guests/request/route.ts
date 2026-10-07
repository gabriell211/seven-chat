import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { liveGuests, liveSessions, notifications } from "@/db/schema";
import { requireRequestSession } from "@/lib/auth";
import { publishRealtimeBestEffort } from "@/lib/realtime";
import { areUsersBlocked } from "@/services/social-guard";

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireRequestSession(req),{id}=await params;
    const [live]=await db.select({hostId:liveSessions.hostId,status:liveSessions.status})
      .from(liveSessions).where(eq(liveSessions.id,id)).limit(1);
    if(!live||live.status!=="live")return NextResponse.json({error:{code:"LIVE_INACTIVE",message:"Live indisponível."}},{status:409});
    if(live.hostId===session.userId)return NextResponse.json({error:{code:"HOST_ALREADY_IN_LIVE",message:"Você já é o host."}},{status:422});
    if(await areUsersBlocked(session.userId,live.hostId))return NextResponse.json({error:{code:"BLOCKED",message:"Pedido indisponível."}},{status:403});

    const [existing]=await db.select({status:liveGuests.status})
      .from(liveGuests).where(and(eq(liveGuests.liveId,id),eq(liveGuests.userId,session.userId))).limit(1);
    if(existing?.status==="accepted")return NextResponse.json({data:{status:"accepted"}});
    if(existing?.status==="requested")return NextResponse.json({data:{status:"requested"}});

    await db.insert(liveGuests).values({liveId:id,userId:session.userId,role:"guest",status:"requested"})
      .onConflictDoUpdate({target:[liveGuests.liveId,liveGuests.userId],set:{status:"requested",role:"guest",joinedAt:null}});
    await db.insert(notifications).values({
      userId:live.hostId,actorId:session.userId,type:"live_guest_request",entityType:"live",entityId:id
    });
    await publishRealtimeBestEffort({channel:"live:"+id,event:"live.guest.requested",data:{userId:session.userId}});
    return NextResponse.json({data:{status:"requested"}},{status:201});
  }catch{
    return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});
  }
}
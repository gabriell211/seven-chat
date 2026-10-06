import { NextResponse } from "next/server";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { fanStatuses, liveSessions, profiles } from "@/db/schema";
import { requireRequestSession } from "@/lib/auth";
import { publishRealtimeBestEffort } from "@/lib/realtime";

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireRequestSession(req),{id}=await params;
    const [live]=await db.select({hostId:liveSessions.hostId,status:liveSessions.status})
      .from(liveSessions).where(eq(liveSessions.id,id)).limit(1);
    if(!live||live.status!=="live")return NextResponse.json({error:{code:"LIVE_INACTIVE",message:"LIVE indisponível."}},{status:409});
    if(live.hostId===session.userId)return NextResponse.json({data:{announced:false}});

    const [membership]=await db.select({id:fanStatuses.id}).from(fanStatuses)
      .where(and(
        eq(fanStatuses.fanUserId,session.userId),
        eq(fanStatuses.creatorUserId,live.hostId),
        eq(fanStatuses.status,"active"),
        gt(fanStatuses.endsAt,new Date())
      )).limit(1);
    if(!membership)return NextResponse.json({data:{announced:false}});

    const [profile]=await db.select({displayName:profiles.displayName}).from(profiles)
      .where(eq(profiles.userId,session.userId)).limit(1);
    await publishRealtimeBestEffort({
      channel:"live:"+id,event:"live.fan.joined",
      data:{userId:session.userId,displayName:profile?.displayName??"Mega Fã"}
    });
    return NextResponse.json({data:{announced:true}});
  }catch{
    return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});
  }
}

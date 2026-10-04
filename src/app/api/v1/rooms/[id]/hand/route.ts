import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { roomMembers, rooms } from "@/db/schema";
import { requireRequestSession } from "@/lib/auth";
import { publishRealtimeBestEffort } from "@/lib/realtime";

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireRequestSession(req),{id}=await params;
    const [room]=await db.select({status:rooms.status}).from(rooms).where(eq(rooms.id,id)).limit(1);
    if(!room||room.status!=="active")return NextResponse.json({error:{code:"ROOM_INACTIVE",message:"Sala indisponível."}},{status:404});
    const changed=await db.update(roomMembers).set({role:"requesting"})
      .where(and(eq(roomMembers.roomId,id),eq(roomMembers.userId,session.userId),eq(roomMembers.role,"listener")))
      .returning({userId:roomMembers.userId});
    if(!changed.length)return NextResponse.json({error:{code:"HAND_NOT_ALLOWED",message:"Não foi possível levantar a mão."}},{status:409});
    await publishRealtimeBestEffort({channel:"room:"+id,event:"room.hand.raised",data:{userId:session.userId}});
    return NextResponse.json({data:{role:"requesting"}});
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}
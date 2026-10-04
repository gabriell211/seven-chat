import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { roomMembers, rooms } from "@/db/schema";
import { requireRequestSession } from "@/lib/auth";
import { publishRealtimeBestEffort } from "@/lib/realtime";

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireRequestSession(req),{id}=await params;
    const [room]=await db.select({hostId:rooms.hostId}).from(rooms).where(eq(rooms.id,id)).limit(1);
    if(!room)return NextResponse.json({data:{left:true}});
    if(room.hostId===session.userId){
      await db.transaction(async tx=>{
        await tx.update(rooms).set({status:"ended",endedAt:new Date()}).where(eq(rooms.id,id));
        await tx.delete(roomMembers).where(eq(roomMembers.roomId,id));
      });
      await publishRealtimeBestEffort({channel:"room:"+id,event:"room.ended",data:{hostId:session.userId}});
    }else{
      await db.delete(roomMembers).where(and(eq(roomMembers.roomId,id),eq(roomMembers.userId,session.userId)));
      await publishRealtimeBestEffort({channel:"room:"+id,event:"room.left",data:{userId:session.userId}});
    }
    return NextResponse.json({data:{left:true}});
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}
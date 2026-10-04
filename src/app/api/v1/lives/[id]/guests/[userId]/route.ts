import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { liveGuests, liveSessions } from "@/db/schema";
import { requireRequestSession } from "@/lib/auth";
import { publishRealtimeBestEffort } from "@/lib/realtime";
export async function DELETE(req:Request,{params}:{params:Promise<{id:string;userId:string}>}){
  try{
    const session=await requireRequestSession(req),{id,userId}=await params;
    const [live]=await db.select({hostId:liveSessions.hostId}).from(liveSessions).where(eq(liveSessions.id,id)).limit(1);
    if(!live||live.hostId!==session.userId)return NextResponse.json({error:{code:"FORBIDDEN",message:"Somente o host remove convidados."}},{status:403});
    await db.update(liveGuests).set({status:"removed"}).where(and(eq(liveGuests.liveId,id),eq(liveGuests.userId,userId)));
    await publishRealtimeBestEffort({channel:"live:"+id,event:"live.guest.removed",data:{userId,hostId:session.userId}});
    return NextResponse.json({data:{removed:true}});
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}
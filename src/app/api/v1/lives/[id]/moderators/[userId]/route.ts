import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { liveModerators, liveSessions } from "@/db/schema";
import { requireRequestSession } from "@/lib/auth";
export async function PUT(req:Request,{params}:{params:Promise<{id:string;userId:string}>}){
  try{
    const session=await requireRequestSession(req),{id,userId}=await params;
    const [live]=await db.select({hostId:liveSessions.hostId}).from(liveSessions).where(eq(liveSessions.id,id)).limit(1);
    if(!live||live.hostId!==session.userId)return NextResponse.json({error:{code:"HOST_ONLY",message:"Somente o host define moderadores."}},{status:403});
    if(userId===live.hostId)return NextResponse.json({data:{moderator:true}});
    await db.insert(liveModerators).values({liveId:id,userId}).onConflictDoNothing();
    return NextResponse.json({data:{moderator:true}});
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}
export async function DELETE(req:Request,{params}:{params:Promise<{id:string;userId:string}>}){
  try{
    const session=await requireRequestSession(req),{id,userId}=await params;
    const [live]=await db.select({hostId:liveSessions.hostId}).from(liveSessions).where(eq(liveSessions.id,id)).limit(1);
    if(!live||live.hostId!==session.userId)return NextResponse.json({error:{code:"HOST_ONLY",message:"Somente o host define moderadores."}},{status:403});
    await db.delete(liveModerators).where(and(eq(liveModerators.liveId,id),eq(liveModerators.userId,userId)));
    return NextResponse.json({data:{moderator:false}});
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}
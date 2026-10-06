import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { liveModerators, liveSessions, profiles, users } from "@/db/schema";
import { requireRequestSession } from "@/lib/auth";

export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireRequestSession(req),{id}=await params;
    const [live]=await db.select({hostId:liveSessions.hostId,status:liveSessions.status}).from(liveSessions).where(eq(liveSessions.id,id)).limit(1);
    if(!live||!["created","live"].includes(live.status))return NextResponse.json({error:{code:"LIVE_NOT_FOUND",message:"LIVE indisponível."}},{status:404});
    const rows=await db.select({
      userId:liveModerators.userId,username:users.username,displayName:profiles.displayName,avatarUrl:profiles.avatarUrl
    }).from(liveModerators)
      .innerJoin(users,eq(liveModerators.userId,users.id))
      .innerJoin(profiles,eq(users.id,profiles.userId))
      .where(eq(liveModerators.liveId,id));
    return NextResponse.json({data:{moderators:rows,isHost:live.hostId===session.userId,isModerator:rows.some(v=>v.userId===session.userId)}});
  }catch{
    return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});
  }
}

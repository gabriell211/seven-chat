import { NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { accountDeletionRequests, auditLogs, users } from "@/db/schema";
import { requireRequestSession } from "@/lib/auth";

export async function GET(req:Request){
  try{
    const session=await requireRequestSession(req);
    const [row]=await db.select().from(accountDeletionRequests).where(eq(accountDeletionRequests.userId,session.userId))
      .orderBy(desc(accountDeletionRequests.requestedAt)).limit(1);
    return NextResponse.json({data:row??null});
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}
export async function POST(req:Request){
  try{
    const session=await requireRequestSession(req);
    const [existing]=await db.select().from(accountDeletionRequests).where(and(
      eq(accountDeletionRequests.userId,session.userId),inArray(accountDeletionRequests.status,["scheduled","processing"])
    )).orderBy(desc(accountDeletionRequests.requestedAt)).limit(1);
    if(existing)return NextResponse.json({data:existing},{status:202});
    const scheduledFor=new Date(Date.now()+30*24*60*60*1000);
    const [row]=await db.transaction(async tx=>{
      const [created]=await tx.insert(accountDeletionRequests).values({userId:session.userId,scheduledFor}).returning();
      await tx.update(users).set({status:"deletion_pending",updatedAt:new Date()}).where(eq(users.id,session.userId));
      await tx.insert(auditLogs).values({actorId:session.userId,action:"account.deletion_requested",targetType:"user",targetId:session.userId,metadata:{scheduledFor:scheduledFor.toISOString()}});
      return [created];
    });
    return NextResponse.json({data:row},{status:202});
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}
export async function DELETE(req:Request){
  try{
    const session=await requireRequestSession(req);
    const [row]=await db.select().from(accountDeletionRequests).where(and(
      eq(accountDeletionRequests.userId,session.userId),eq(accountDeletionRequests.status,"scheduled")
    )).orderBy(desc(accountDeletionRequests.requestedAt)).limit(1);
    if(!row)return NextResponse.json({data:{canceled:false}});
    await db.transaction(async tx=>{
      await tx.update(accountDeletionRequests).set({status:"canceled",canceledAt:new Date()}).where(eq(accountDeletionRequests.id,row.id));
      await tx.update(users).set({status:"active",updatedAt:new Date()}).where(eq(users.id,session.userId));
      await tx.insert(auditLogs).values({actorId:session.userId,action:"account.deletion_canceled",targetType:"user",targetId:session.userId,metadata:{requestId:row.id}});
    });
    return NextResponse.json({data:{canceled:true}});
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}
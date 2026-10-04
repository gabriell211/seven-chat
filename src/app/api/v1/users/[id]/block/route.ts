import { NextResponse } from "next/server";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { blocks, follows } from "@/db/schema";
import { requireRequestSession } from "@/lib/auth";
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireRequestSession(req),{id}=await params;
    if(id===session.userId)return NextResponse.json({error:{code:"SELF_BLOCK",message:"Operação inválida."}},{status:422});
    await db.transaction(async tx=>{
      await tx.insert(blocks).values({blockerId:session.userId,blockedId:id}).onConflictDoNothing();
      await tx.delete(follows).where(or(
        and(eq(follows.followerId,session.userId),eq(follows.followingId,id)),
        and(eq(follows.followerId,id),eq(follows.followingId,session.userId))
      ));
    });
    return NextResponse.json({data:{blocked:true}});
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}
export async function DELETE(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireRequestSession(req),{id}=await params;
    await db.delete(blocks).where(and(eq(blocks.blockerId,session.userId),eq(blocks.blockedId,id)));
    return NextResponse.json({data:{blocked:false}});
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}
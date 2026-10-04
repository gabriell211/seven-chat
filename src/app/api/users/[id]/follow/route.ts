import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { follows, notifications, users } from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { areUsersBlocked } from "@/services/social-guard";
export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireSession(),{id}=await params;
    if(id===session.userId)return NextResponse.json({error:{code:"SELF_FOLLOW",message:"Você não pode seguir a si mesmo."}},{status:422});
    if(await areUsersBlocked(session.userId,id))return NextResponse.json({error:{code:"BLOCKED",message:"Ação indisponível."}},{status:403});
    const [target]=await db.select({id:users.id}).from(users).where(eq(users.id,id)).limit(1);
    if(!target)return NextResponse.json({error:{code:"NOT_FOUND",message:"Usuário não encontrado."}},{status:404});
    await db.transaction(async tx=>{
      await tx.insert(follows).values({followerId:session.userId,followingId:id}).onConflictDoNothing();
      await tx.insert(notifications).values({userId:id,actorId:session.userId,type:"follow",entityType:"user",entityId:session.userId});
    });
    return NextResponse.json({data:{following:true}});
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}
export async function DELETE(_:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireSession(),{id}=await params;
    await db.delete(follows).where(and(eq(follows.followerId,session.userId),eq(follows.followingId,id)));
    return NextResponse.json({data:{following:false}});
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}
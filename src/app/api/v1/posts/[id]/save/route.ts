import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts, savedPosts } from "@/db/schema";
import { requireRequestSession } from "@/lib/auth";
export async function PUT(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireRequestSession(req),{id}=await params;
    const [post]=await db.select({id:posts.id}).from(posts).where(eq(posts.id,id)).limit(1);
    if(!post)return NextResponse.json({error:{code:"NOT_FOUND",message:"Post não encontrado."}},{status:404});
    await db.insert(savedPosts).values({postId:id,userId:session.userId}).onConflictDoNothing();
    return NextResponse.json({data:{saved:true}});
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}
export async function DELETE(req:Request,{params}:{params:Promise<{id:string}>}){
  try{const session=await requireRequestSession(req),{id}=await params;await db.delete(savedPosts).where(and(eq(savedPosts.postId,id),eq(savedPosts.userId,session.userId)));return NextResponse.json({data:{saved:false}})}
  catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}
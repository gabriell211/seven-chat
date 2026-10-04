import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifications, postReactions, posts } from "@/db/schema";
import { requireSession } from "@/lib/auth";
const schema=z.object({reaction:z.enum(["like","love","laugh","wow","sad"])});
export async function PUT(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireSession(),{id}=await params;
    const parsed=schema.safeParse(await req.json());
    if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Reação inválida."}},{status:422});
    const [post]=await db.select({authorId:posts.authorId}).from(posts).where(eq(posts.id,id)).limit(1);
    if(!post)return NextResponse.json({error:{code:"NOT_FOUND",message:"Post não encontrado."}},{status:404});
    await db.transaction(async tx=>{
      await tx.insert(postReactions).values({postId:id,userId:session.userId,reaction:parsed.data.reaction})
        .onConflictDoUpdate({target:[postReactions.postId,postReactions.userId],set:{reaction:parsed.data.reaction}});
      if(post.authorId!==session.userId)await tx.insert(notifications).values({userId:post.authorId,actorId:session.userId,type:"post_reaction",entityType:"post",entityId:id});
    });
    return NextResponse.json({data:{reaction:parsed.data.reaction}});
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}
export async function DELETE(_:Request,{params}:{params:Promise<{id:string}>}){
  try{const session=await requireSession(),{id}=await params;await db.delete(postReactions).where(and(eq(postReactions.postId,id),eq(postReactions.userId,session.userId)));return NextResponse.json({data:{reaction:null}})}
  catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}
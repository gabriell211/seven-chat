import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts, profiles, users } from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { postSchema } from "@/lib/validation";
export async function GET(){
  const rows=await db.select({
    id:posts.id,body:posts.body,createdAt:posts.createdAt,
    username:users.username,displayName:profiles.displayName
  }).from(posts).innerJoin(users,eq(posts.authorId,users.id)).innerJoin(profiles,eq(posts.authorId,profiles.userId))
    .where(eq(posts.visibility,"public")).orderBy(desc(posts.createdAt)).limit(50);
  return NextResponse.json({data:rows});
}
export async function POST(req:Request){
  try{
    const session=await requireSession();
    const parsed=postSchema.safeParse(Object.fromEntries(await req.formData()));
    if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Publicação inválida."}},{status:422});
    await db.insert(posts).values({authorId:session.userId,body:parsed.data.body,visibility:parsed.data.visibility});
    return NextResponse.redirect(new URL("/",req.url),303);
  }catch{
    return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});
  }
}
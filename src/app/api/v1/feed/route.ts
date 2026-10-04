import { NextResponse } from "next/server";
import { and, desc, eq, lt, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { blocks, posts, profiles, users } from "@/db/schema";
import { getRequestSession } from "@/lib/auth";
export async function GET(req:Request){
  const session=await getRequestSession(req);
  const url=new URL(req.url),cursor=url.searchParams.get("cursor");
  const before=cursor?new Date(cursor):null;
  if(before&&Number.isNaN(before.getTime()))return NextResponse.json({error:{code:"INVALID_CURSOR",message:"Cursor inválido."}},{status:422});
  const where=and(eq(posts.visibility,"public"),before?lt(posts.createdAt,before):undefined);
  const rows=await db.select({
    id:posts.id,body:posts.body,media:posts.media,createdAt:posts.createdAt,
    authorId:users.id,username:users.username,displayName:profiles.displayName,avatarUrl:profiles.avatarUrl
  }).from(posts).innerJoin(users,eq(posts.authorId,users.id)).innerJoin(profiles,eq(posts.authorId,profiles.userId))
    .where(where).orderBy(desc(posts.createdAt)).limit(21);
  let filtered=rows;
  if(session){
    const hidden=await db.select({blockerId:blocks.blockerId,blockedId:blocks.blockedId}).from(blocks)
      .where(or(eq(blocks.blockerId,session.userId),eq(blocks.blockedId,session.userId)));
    const ids=new Set(hidden.flatMap(v=>[v.blockerId,v.blockedId]).filter(v=>v!==session.userId));
    filtered=rows.filter(v=>!ids.has(v.authorId));
  }
  const page=filtered.slice(0,20);
  return NextResponse.json({data:page,nextCursor:filtered.length>20?page.at(-1)?.createdAt.toISOString()??null:null});
}
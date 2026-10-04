import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles, reels, users } from "@/db/schema";
export async function GET(){
  const data=await db.select({id:reels.id,caption:reels.caption,videoUrl:reels.videoUrl,thumbnailUrl:reels.thumbnailUrl,durationMs:reels.durationMs,viewCount:reels.viewCount,createdAt:reels.createdAt,username:users.username,displayName:profiles.displayName})
    .from(reels).innerJoin(users,eq(reels.authorId,users.id)).innerJoin(profiles,eq(reels.authorId,profiles.userId))
    .where(eq(reels.visibility,"public")).orderBy(desc(reels.createdAt)).limit(30);
  return NextResponse.json({data});
}
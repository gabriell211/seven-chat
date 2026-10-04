import { and, eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { blocks } from "@/db/schema";

export async function areUsersBlocked(a:string,b:string):Promise<boolean>{
  const found=await db.select({blockerId:blocks.blockerId}).from(blocks)
    .where(or(and(eq(blocks.blockerId,a),eq(blocks.blockedId,b)),and(eq(blocks.blockerId,b),eq(blocks.blockedId,a))))
    .limit(1);
  return found.length>0;
}
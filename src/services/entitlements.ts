import { and, desc, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { vipSubscriptions } from "@/db/schema";

const rank:Record<string,number>={vip:1,"vip+":2,elite:3};

export async function getVipTier(userId:string):Promise<"vip"|"vip+"|"elite"|null>{
  const [row]=await db.select({plan:vipSubscriptions.plan}).from(vipSubscriptions)
    .where(and(eq(vipSubscriptions.userId,userId),eq(vipSubscriptions.status,"active"),gt(vipSubscriptions.endsAt,new Date())))
    .orderBy(desc(vipSubscriptions.endsAt)).limit(1);
  return row&&row.plan in rank?row.plan as "vip"|"vip+"|"elite":null;
}
export async function hasVipAtLeast(userId:string,tier:"vip"|"vip+"|"elite"):Promise<boolean>{
  const current=await getVipTier(userId);
  return current!==null&&rank[current]>=rank[tier];
}
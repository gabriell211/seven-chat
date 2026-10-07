import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { vipPlans } from "@/db/schema";

export const SEVEN_VIP_MONTHLY="seven-vip-monthly";
export const SEVEN_VIP_30D="seven-vip-30d";
export const SEVEN_VIP_CODES=[SEVEN_VIP_MONTHLY,SEVEN_VIP_30D] as const;

let ensurePromise:Promise<void>|null=null;

export function isSevenVipCode(value:string){
  return SEVEN_VIP_CODES.includes(value as (typeof SEVEN_VIP_CODES)[number]);
}

export async function ensureSevenVipCatalog(){
  ensurePromise??=(async()=>{
    await db.transaction(async tx=>{
      await tx.insert(vipPlans).values({code:SEVEN_VIP_MONTHLY,tier:"vip",durationDays:30,currency:"BRL",priceMinor:2390,storeProductIds:{},isActive:true})
        .onConflictDoUpdate({target:vipPlans.code,set:{tier:"vip",durationDays:30,currency:"BRL",priceMinor:2390,isActive:true}});
      await tx.insert(vipPlans).values({code:SEVEN_VIP_30D,tier:"vip",durationDays:30,currency:"BRL",priceMinor:3990,storeProductIds:{infinitepay:SEVEN_VIP_30D},isActive:true})
        .onConflictDoUpdate({target:vipPlans.code,set:{tier:"vip",durationDays:30,currency:"BRL",priceMinor:3990,isActive:true}});
    });
  })().catch(error=>{ensurePromise=null;throw error;});
  return ensurePromise;
}

export async function getSevenVipPlans(){
  await ensureSevenVipCatalog();
  return db.select().from(vipPlans).where(and(eq(vipPlans.isActive,true),inArray(vipPlans.code,[...SEVEN_VIP_CODES])));
}

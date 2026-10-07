import { NextResponse } from "next/server";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { diamondPackages, vipPlans } from "@/db/schema";
import { ensureSevenVipCatalog, SEVEN_VIP_CODES } from "@/services/vip-catalog";
export async function GET(){
  await ensureSevenVipCatalog();
  const [diamonds,vip]=await Promise.all([
    db.select({sku:diamondPackages.sku,diamonds:diamondPackages.diamonds,bonusDiamonds:diamondPackages.bonusDiamonds,currency:diamondPackages.currency,priceMinor:diamondPackages.priceMinor,storeProductIds:diamondPackages.storeProductIds}).from(diamondPackages).where(eq(diamondPackages.isActive,true)).orderBy(asc(diamondPackages.priceMinor)),
    db.select({code:vipPlans.code,tier:vipPlans.tier,durationDays:vipPlans.durationDays,currency:vipPlans.currency,priceMinor:vipPlans.priceMinor,storeProductIds:vipPlans.storeProductIds}).from(vipPlans).where(inArray(vipPlans.code,[...SEVEN_VIP_CODES])).orderBy(asc(vipPlans.priceMinor))
  ]);
  return NextResponse.json({data:{diamonds,vip:vip.map(plan=>({...plan,billingMode:plan.code==="seven-vip-monthly"?"subscription":"one_time"}))}});
}
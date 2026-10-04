import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { diamondPackages, vipPlans } from "@/db/schema";
export async function GET(){
  const [diamonds,vip]=await Promise.all([
    db.select({sku:diamondPackages.sku,diamonds:diamondPackages.diamonds,bonusDiamonds:diamondPackages.bonusDiamonds,currency:diamondPackages.currency,priceMinor:diamondPackages.priceMinor,storeProductIds:diamondPackages.storeProductIds}).from(diamondPackages).where(eq(diamondPackages.isActive,true)).orderBy(asc(diamondPackages.priceMinor)),
    db.select({code:vipPlans.code,tier:vipPlans.tier,durationDays:vipPlans.durationDays,currency:vipPlans.currency,priceMinor:vipPlans.priceMinor,storeProductIds:vipPlans.storeProductIds}).from(vipPlans).where(eq(vipPlans.isActive,true)).orderBy(asc(vipPlans.priceMinor))
  ]);
  return NextResponse.json({data:{diamonds,vip}});
}
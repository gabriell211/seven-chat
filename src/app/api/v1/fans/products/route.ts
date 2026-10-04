import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { fanProducts } from "@/db/schema";
export async function GET(){
  const data=await db.select({code:fanProducts.code,tier:fanProducts.tier,durationDays:fanProducts.durationDays,priceDiamonds:fanProducts.priceDiamonds})
    .from(fanProducts).where(eq(fanProducts.isActive,true)).orderBy(asc(fanProducts.priceDiamonds));
  return NextResponse.json({data});
}
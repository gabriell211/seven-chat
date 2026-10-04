import { NextResponse } from "next/server";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { gifts, ledgerAccounts, ledgerEntries } from "@/db/schema";
import { requireRequestSession } from "@/lib/auth";

export async function GET(req:Request){
  try{
    const session=await requireRequestSession(req);
    const key="user:"+session.userId+":diamonds";
    const rows=await db.select({
      balance:sql<number>`coalesce(sum(case when ${ledgerEntries.direction}='credit' then ${ledgerEntries.amount} else -${ledgerEntries.amount} end),0)`
    }).from(ledgerAccounts).leftJoin(ledgerEntries,eq(ledgerEntries.accountId,ledgerAccounts.id))
      .where(and(eq(ledgerAccounts.accountKey,key),eq(ledgerAccounts.status,"active")));
    const catalog=await db.select({
      id:gifts.id,slug:gifts.slug,name:gifts.name,category:gifts.category,
      priceDiamonds:gifts.priceDiamonds,animationType:gifts.animationType,assetUrl:gifts.assetUrl,metadata:gifts.metadata
    }).from(gifts).where(eq(gifts.isActive,true)).orderBy(asc(gifts.priceDiamonds)).limit(300);
    return NextResponse.json({data:{balance:Number(rows[0]?.balance??0),gifts:catalog}});
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}
import { and, eq, inArray } from "drizzle-orm";
import { db, pool } from "@/lib/db";
import { vipPlans } from "@/db/schema";

export const SEVEN_VIP_MONTHLY="seven-vip-monthly";
export const SEVEN_VIP_30D="seven-vip-30d";
export const SEVEN_VIP_CODES=[SEVEN_VIP_MONTHLY,SEVEN_VIP_30D] as const;

let ensurePromise:Promise<void>|null=null;

export function isSevenVipCode(value:string){
  return SEVEN_VIP_CODES.includes(value as (typeof SEVEN_VIP_CODES)[number]);
}

async function ensureVipInfrastructure(){
  await pool.query(`
    create table if not exists vip_plans (
      id uuid primary key default gen_random_uuid(),
      code text not null,
      tier text not null,
      duration_days integer not null default 30,
      currency text not null,
      price_minor integer not null,
      store_product_ids jsonb not null default '{}'::jsonb,
      is_active boolean not null default true,
      created_at timestamptz not null default now()
    );
    create unique index if not exists vip_plans_code_uq on vip_plans(code);

    create table if not exists purchase_intents (
      id uuid primary key default gen_random_uuid(),
      purchaser_user_id text not null references users(id),
      beneficiary_user_id text not null references users(id),
      provider text not null,
      product_type text not null,
      sku text not null,
      status text not null default 'created',
      expires_at timestamptz not null,
      consumed_at timestamptz,
      created_at timestamptz not null default now()
    );
    create index if not exists purchase_intents_purchaser_idx on purchase_intents(purchaser_user_id,created_at);
    create index if not exists purchase_intents_expiry_idx on purchase_intents(status,expires_at);

    create table if not exists payments (
      id uuid primary key default gen_random_uuid(),
      user_id text not null references users(id),
      provider text not null,
      product_type text not null,
      sku text not null,
      external_transaction_id text not null,
      status text not null default 'pending',
      currency text,
      amount_minor integer,
      receipt_hash text,
      raw_metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      paid_at timestamptz,
      refunded_at timestamptz
    );
    create unique index if not exists payments_provider_external_uq on payments(provider,external_transaction_id);
    create index if not exists payments_user_created_idx on payments(user_id,created_at);

    create table if not exists vip_subscriptions (
      id uuid primary key default gen_random_uuid(),
      user_id text not null references users(id),
      plan text not null,
      status text not null,
      provider text not null,
      external_id text,
      starts_at timestamptz not null,
      ends_at timestamptz not null,
      created_at timestamptz not null default now()
    );
    create index if not exists vip_user_status_idx on vip_subscriptions(user_id,status,ends_at);

    create table if not exists vip_gifts (
      id uuid primary key default gen_random_uuid(),
      sender_id text not null references users(id),
      receiver_id text not null references users(id),
      plan_id uuid not null references vip_plans(id),
      payment_id uuid not null references payments(id),
      starts_at timestamptz not null,
      ends_at timestamptz not null,
      created_at timestamptz not null default now()
    );
    create index if not exists vip_gifts_receiver_idx on vip_gifts(receiver_id,created_at);
  `);
}

export async function ensureSevenVipCatalog(){
  ensurePromise??=(async()=>{
    await ensureVipInfrastructure();
    await db.transaction(async tx=>{
      await tx.insert(vipPlans).values({
        code:SEVEN_VIP_MONTHLY,tier:"vip",durationDays:30,currency:"BRL",priceMinor:2390,storeProductIds:{},isActive:true
      }).onConflictDoUpdate({
        target:vipPlans.code,set:{tier:"vip",durationDays:30,currency:"BRL",priceMinor:2390,isActive:true}
      });
      await tx.insert(vipPlans).values({
        code:SEVEN_VIP_30D,tier:"vip",durationDays:30,currency:"BRL",priceMinor:3990,storeProductIds:{infinitepay:SEVEN_VIP_30D},isActive:true
      }).onConflictDoUpdate({
        target:vipPlans.code,set:{tier:"vip",durationDays:30,currency:"BRL",priceMinor:3990,isActive:true}
      });
    });
  })().catch(error=>{ensurePromise=null;throw error;});
  return ensurePromise;
}

export async function getSevenVipPlans(){
  await ensureSevenVipCatalog();
  return db.select().from(vipPlans)
    .where(and(eq(vipPlans.isActive,true),inArray(vipPlans.code,[...SEVEN_VIP_CODES])));
}

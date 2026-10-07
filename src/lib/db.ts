import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";

function databaseUrl(){
  const raw=process.env.DATABASE_URL;
  if(!raw)return undefined;
  try{
    const url=new URL(raw);
    const mode=url.searchParams.get("sslmode");
    if(mode&&mode!=="disable"&&mode!=="verify-full")url.searchParams.set("sslmode","verify-full");
    return url.toString();
  }catch{
    return raw;
  }
}

const globalForDb=globalThis as unknown as {sevenPool?:Pool};
const pool=globalForDb.sevenPool??new Pool({
  connectionString:databaseUrl(),
  max:8,
  idleTimeoutMillis:20000,
  connectionTimeoutMillis:5000
});

if(process.env.NODE_ENV!=="production")globalForDb.sevenPool=pool;
attachDatabasePool(pool);

export const db=drizzle(pool,{schema});
export {pool};

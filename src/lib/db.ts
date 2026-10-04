import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";

const globalForDb = globalThis as unknown as { sevenPool?: Pool };
const pool = globalForDb.sevenPool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 8,
  idleTimeoutMillis: 20000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined
});
if (process.env.NODE_ENV !== "production") globalForDb.sevenPool = pool;
attachDatabasePool(pool);
export const db = drizzle(pool, { schema });
export { pool };
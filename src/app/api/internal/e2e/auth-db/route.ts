import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { LEGAL_VERSION, PRIVACY_DOCUMENT, TERMS_DOCUMENT } from "@/lib/legal";
import { ensureUsersUsernameColumn } from "@/lib/schema-compat";

const AUTH_TABLES=[
  "users",
  "profiles",
  "user_consents",
  "auth_challenges",
  "user_sessions",
  "account_security",
  "oauth_accounts"
] as const;

export async function GET(req:Request){
  if(process.env.VERCEL_ENV==="production"){
    return NextResponse.json({error:"not_found"},{status:404});
  }

  const url=new URL(req.url);
  const expected=process.env.E2E_TEST_KEY;
  const supplied=url.searchParams.get("key");
  if(!expected||!supplied||supplied!==expected){
    return NextResponse.json({error:"unauthorized"},{status:401});
  }

  if(url.searchParams.get("mode")==="inspect"){
    const columns=await pool.query<{
      table_name:string;
      column_name:string;
      data_type:string;
      udt_name:string;
      is_nullable:string;
      column_default:string|null;
    }>(`
      SELECT table_name,column_name,data_type,udt_name,is_nullable,column_default
      FROM information_schema.columns
      WHERE table_schema='public'
        AND table_name=ANY($1::text[])
      ORDER BY table_name,ordinal_position
    `,[AUTH_TABLES]);

    const constraints=await pool.query<{
      table_name:string;
      constraint_name:string;
      constraint_type:string;
    }>(`
      SELECT tc.table_name,tc.constraint_name,tc.constraint_type
      FROM information_schema.table_constraints tc
      WHERE tc.table_schema='public'
        AND tc.table_name=ANY($1::text[])
      ORDER BY tc.table_name,tc.constraint_name
    `,[AUTH_TABLES]);

    const enumValues=await pool.query<{type_name:string;value:string}>(`
      SELECT t.typname AS type_name,e.enumlabel AS value
      FROM pg_type t
      JOIN pg_enum e ON t.oid=e.enumtypid
      JOIN pg_namespace n ON n.oid=t.typnamespace
      WHERE n.nspname='public'
      ORDER BY t.typname,e.enumsortorder
    `);

    const inventory=await pool.query<{table_name:string;estimated_rows:string}>(`
      SELECT c.relname AS table_name,c.reltuples::bigint::text AS estimated_rows
      FROM pg_class c
      JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind='r'
      ORDER BY c.relname
    `);

    const usersCompatibility=await pool.query<{
      total:string;
      uuid_ids:string;
      non_uuid_ids:string;
      profiles_total:string;
    }>(`
      SELECT
        (SELECT count(*)::text FROM users) AS total,
        (SELECT count(*)::text FROM users
          WHERE id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$') AS uuid_ids,
        (SELECT count(*)::text FROM users
          WHERE id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$') AS non_uuid_ids,
        (SELECT count(*)::text FROM profiles) AS profiles_total
    `);

    return NextResponse.json({
      tables:AUTH_TABLES,
      columns:columns.rows,
      constraints:constraints.rows,
      enums:enumValues.rows,
      inventory:inventory.rows,
      compatibility:usersCompatibility.rows[0]
    });
  }

  await ensureUsersUsernameColumn();

  const id=randomUUID();
  const suffix=id.replaceAll("-","").slice(0,10);
  const email=`e2e-${suffix}@example.com`;
  const username=`e2e_${suffix}`;
  const client=await pool.connect();

  let inserted=false;
  let relatedRows=false;
  let uniqueConstraint=false;
  let rolledBack=false;

  try{
    await client.query("BEGIN");

    await client.query(
      `INSERT INTO users (id,email,username,password_hash,birth_date,status)
       VALUES ($1,$2,$3,$4,$5,'pending_verification')`,
      [id,email,username,"e2e-hash",new Date("2000-01-01T00:00:00.000Z")]
    );

    await client.query(
      `INSERT INTO profiles (user_id,display_name) VALUES ($1,$2)`,
      [id,"Seven E2E"]
    );

    await client.query(
      `INSERT INTO user_consents (user_id,document,version)
       VALUES ($1,$2,$4),($1,$3,$4)`,
      [id,TERMS_DOCUMENT,PRIVACY_DOCUMENT,LEGAL_VERSION]
    );

    const visible=await client.query<{users:string;profiles:string;consents:string}>(`
      SELECT
        (SELECT count(*)::text FROM users WHERE id=$1) AS users,
        (SELECT count(*)::text FROM profiles WHERE user_id=$1) AS profiles,
        (SELECT count(*)::text FROM user_consents WHERE user_id=$1) AS consents
    `,[id]);

    inserted=visible.rows[0]?.users==="1";
    relatedRows=visible.rows[0]?.profiles==="1"&&visible.rows[0]?.consents==="2";

    await client.query("SAVEPOINT duplicate_username");
    try{
      await client.query(
        `INSERT INTO users (email,username,password_hash,birth_date,status)
         VALUES ($1,$2,$3,$4,'pending_verification')`,
        [`duplicate-${suffix}@example.com`,username,"e2e-hash",new Date("2000-01-01T00:00:00.000Z")]
      );
    }catch(error){
      uniqueConstraint=(error as {code?:string}).code==="23505";
      await client.query("ROLLBACK TO SAVEPOINT duplicate_username");
    }

    await client.query("ROLLBACK");

    const after=await pool.query<{count:string}>(
      "SELECT count(*)::text AS count FROM users WHERE id=$1",
      [id]
    );
    rolledBack=after.rows[0]?.count==="0";
  }finally{
    client.release();
  }

  const ok=inserted&&relatedRows&&uniqueConstraint&&rolledBack;
  return NextResponse.json({
    ok,
    checks:{
      usersInsert:inserted,
      profileAndConsents:relatedRows,
      usernameUnique:uniqueConstraint,
      transactionRollback:rolledBack
    }
  },{status:ok?200:500});
}

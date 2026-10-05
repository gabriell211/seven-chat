import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { LEGAL_VERSION, PRIVACY_DOCUMENT, TERMS_DOCUMENT } from "@/lib/legal";
import { ensureUsersUsernameColumn } from "@/lib/schema-compat";

export async function GET(req:Request){
  if(process.env.VERCEL_ENV==="production"){
    return NextResponse.json({error:"not_found"},{status:404});
  }

  const expected=process.env.E2E_TEST_KEY;
  const supplied=new URL(req.url).searchParams.get("key");
  if(!expected||!supplied||supplied!==expected){
    return NextResponse.json({error:"unauthorized"},{status:401});
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

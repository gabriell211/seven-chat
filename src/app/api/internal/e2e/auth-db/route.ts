import { createHash, randomBytes, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { POST as registerPost } from "@/app/api/v1/auth/register/route";
import { POST as verifyEmailPost } from "@/app/api/v1/auth/verify-email/route";
import { POST as loginPost } from "@/app/api/v1/auth/login/route";
import { GET as meGet } from "@/app/api/v1/auth/me/route";
import { pool } from "@/lib/db";
import { isTransactionalEmailConfigured } from "@/lib/email";
import { LEGAL_VERSION, PRIVACY_DOCUMENT, TERMS_DOCUMENT } from "@/lib/legal";
import { ensureAuthSchemaCompatibility } from "@/lib/schema-compat";

const AUTH_TABLES=[
  "users",
  "profiles",
  "user_consents",
  "auth_challenges",
  "user_sessions",
  "account_security",
  "oauth_accounts"
] as const;

async function cleanupFlowUser(email:string){
  const found=await pool.query<{id:string}>("SELECT id FROM users WHERE email=$1 LIMIT 1",[email]);
  const userId=found.rows[0]?.id;
  if(!userId)return;

  for(const table of [
    "user_sessions",
    "auth_challenges",
    "user_consents",
    "account_security",
    "oauth_accounts",
    "user_roles",
    "webauthn_credentials"
  ]){
    await pool.query(`DELETE FROM "${table}" WHERE "user_id"=$1`,[userId]).catch(()=>undefined);
  }

  await pool.query('DELETE FROM "profiles" WHERE "user_id"=$1',[userId]).catch(()=>undefined);
  await pool.query('DELETE FROM "users" WHERE "id"=$1',[userId]);
}

async function runAuthFlow(req:Request){
  await ensureAuthSchemaCompatibility();

  const suffix=randomUUID().replaceAll("-","").slice(0,10);
  const email=`e2e-${suffix}@example.org`;
  const username=`e2e_${suffix}`;
  const password="SevenE2E!2026";
  const origin=new URL(req.url).origin;

  const checks={
    register201:false,
    databaseRows:false,
    duplicate409:false,
    verify200:false,
    verifiedState:false,
    wrongPassword401:false,
    login200:false,
    sessionCreated:false,
    me200:false,
    cleanup:false
  };

  try{
    const registrationRequest=new Request(origin+"/api/v1/auth/register",{
      method:"POST",
      headers:{"content-type":"application/json","user-agent":"Seven Chat E2E"},
      body:JSON.stringify({
        displayName:"Seven E2E",
        username,
        email,
        birthDate:"2000-01-01",
        password,
        termsAccepted:true
      })
    });

    const registration=await registerPost(registrationRequest);
    checks.register201=registration.status===201;
    const registrationBody=await registration.json().catch(()=>null) as {data?:{userId?:string}}|null;
    const userId=registrationBody?.data?.userId;

    if(!checks.register201||!userId)throw new Error(`REGISTER_STATUS_${registration.status}`);

    const rows=await pool.query<{users:string;profiles:string;consents:string}>(`
      SELECT
        (SELECT count(*)::text FROM users WHERE id=$1) AS users,
        (SELECT count(*)::text FROM profiles WHERE user_id=$1) AS profiles,
        (SELECT count(*)::text FROM user_consents WHERE user_id=$1) AS consents
    `,[userId]);
    checks.databaseRows=rows.rows[0]?.users==="1"&&rows.rows[0]?.profiles==="1"&&rows.rows[0]?.consents==="2";

    const duplicate=await registerPost(new Request(origin+"/api/v1/auth/register",{
      method:"POST",
      headers:{"content-type":"application/json","user-agent":"Seven Chat E2E"},
      body:JSON.stringify({
        displayName:"Seven E2E",
        username,
        email,
        birthDate:"2000-01-01",
        password,
        termsAccepted:true
      })
    }));
    checks.duplicate409=duplicate.status===409;

    const rawToken=randomBytes(32).toString("base64url");
    const tokenHash=createHash("sha256").update(rawToken).digest("hex");

    await pool.query('DELETE FROM "auth_challenges" WHERE "user_id"=$1',[userId]);
    await pool.query(
      `UPDATE "users" SET "status"='pending_verification',"email_verified_at"=NULL WHERE "id"=$1`,
      [userId]
    );
    await pool.query(
      `INSERT INTO "auth_challenges"("user_id","purpose","token_hash","expires_at")
       VALUES($1,'verify_email',$2,now()+interval '1 hour')`,
      [userId,tokenHash]
    );

    const verification=await verifyEmailPost(new Request(origin+"/api/v1/auth/verify-email",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({token:rawToken})
    }));
    checks.verify200=verification.status===200;

    const verified=await pool.query<{status:string;verified:boolean}>(`
      SELECT status,(email_verified_at IS NOT NULL) AS verified
      FROM users WHERE id=$1
    `,[userId]);
    checks.verifiedState=verified.rows[0]?.status==="active"&&verified.rows[0]?.verified===true;

    const wrongPassword=await loginPost(new Request(origin+"/api/v1/auth/login",{
      method:"POST",
      headers:{"content-type":"application/json","user-agent":"Seven Chat E2E"},
      body:JSON.stringify({
        identifier:email,
        password:"wrong-password",
        deviceName:"Seven E2E",
        platform:"android"
      })
    }));
    checks.wrongPassword401=wrongPassword.status===401;

    const login=await loginPost(new Request(origin+"/api/v1/auth/login",{
      method:"POST",
      headers:{"content-type":"application/json","user-agent":"Seven Chat E2E"},
      body:JSON.stringify({
        identifier:email,
        password,
        deviceName:"Seven E2E",
        platform:"android"
      })
    }));
    checks.login200=login.status===200;
    const loginBody=await login.json().catch(()=>null) as {data?:{accessToken?:string}}|null;
    const accessToken=loginBody?.data?.accessToken;

    const sessions=await pool.query<{count:string}>(
      'SELECT count(*)::text AS count FROM "user_sessions" WHERE "user_id"=$1 AND "revoked_at" IS NULL',
      [userId]
    );
    checks.sessionCreated=sessions.rows[0]?.count==="1";

    if(accessToken){
      const me=await meGet(new Request(origin+"/api/v1/auth/me",{
        headers:{authorization:`Bearer ${accessToken}`}
      }));
      checks.me200=me.status===200;
    }

  }finally{
    await cleanupFlowUser(email);
    checks.cleanup=(await pool.query<{count:string}>(
      "SELECT count(*)::text AS count FROM users WHERE email=$1",
      [email]
    )).rows[0]?.count==="0";
  }

  const ok=Object.values(checks).every(Boolean);
  return {ok,checks,emailVerificationConfigured:isTransactionalEmailConfigured()};
}

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

  if(url.searchParams.get("mode")==="flow"){
    try{
      const result=await runAuthFlow(req);
      return NextResponse.json(result,{status:result.ok?200:500});
    }catch(error){
      return NextResponse.json({
        ok:false,
        error:{
          code:"E2E_FLOW_FAILED",
          message:error instanceof Error?error.message:"unknown"
        }
      },{status:500});
    }
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

  await ensureAuthSchemaCompatibility();

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

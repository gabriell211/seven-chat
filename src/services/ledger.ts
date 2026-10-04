import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { pool } from "@/lib/db";

export class LedgerError extends Error{
  constructor(public readonly code:string,message:string){super(message);}
}
type Entry={accountId:string;direction:"debit"|"credit";amount:number};

export async function ensureLedgerAccount(client:PoolClient,key:string,ownerType:string,ownerId:string|null){
  await client.query(
    `insert into ledger_accounts(id,account_key,owner_type,owner_id,asset,status)
     values($1,$2,$3,$4,'diamonds','active') on conflict(account_key) do nothing`,
    [randomUUID(),key,ownerType,ownerId]
  );
  const result=await client.query<{id:string}>("select id from ledger_accounts where account_key=$1 and status='active' for update",[key]);
  if(!result.rowCount)throw new LedgerError("LEDGER_ACCOUNT_UNAVAILABLE","Conta contábil indisponível.");
  return result.rows[0].id;
}
export async function ensureUserDiamondAccount(client:PoolClient,userId:string){return ensureLedgerAccount(client,`user:${userId}:diamonds`,"user",userId);}
export async function ensureSystemDiamondAccount(client:PoolClient){return ensureLedgerAccount(client,"system:diamonds:sink","system",null);}

export async function getLedgerBalance(client:PoolClient,accountId:string){
  const result=await client.query<{balance:string}>(
    "select coalesce(sum(case when direction='credit' then amount else -amount end),0)::text balance from ledger_entries where account_id=$1",
    [accountId]
  );
  return Number(result.rows[0]?.balance??0);
}
export async function postLedgerTransaction(client:PoolClient,input:{type:string;referenceType?:string;referenceId?:string;idempotencyKey:string;entries:Entry[]}){
  const debit=input.entries.filter(v=>v.direction==="debit").reduce((a,v)=>a+v.amount,0);
  const credit=input.entries.filter(v=>v.direction==="credit").reduce((a,v)=>a+v.amount,0);
  if(debit!==credit||debit<=0)throw new LedgerError("LEDGER_UNBALANCED","Transação contábil inválida.");
  const existing=await client.query<{id:string}>("select id from ledger_transactions where idempotency_key=$1",[input.idempotencyKey]);
  if(existing.rowCount)return {transactionId:existing.rows[0].id,duplicate:true};
  const id=randomUUID();
  await client.query(
    "insert into ledger_transactions(id,type,reference_type,reference_id,idempotency_key,status,posted_at) values($1,$2,$3,$4,$5,'posted',now())",
    [id,input.type,input.referenceType??null,input.referenceId??null,input.idempotencyKey]
  );
  for(const entry of input.entries){
    await client.query("insert into ledger_entries(id,transaction_id,account_id,direction,amount) values($1,$2,$3,$4,$5)",
      [randomUUID(),id,entry.accountId,entry.direction,entry.amount]);
  }
  return {transactionId:id,duplicate:false};
}

export async function spendDiamonds(input:{userId:string;amount:number;type:string;referenceType?:string;referenceId?:string;idempotencyKey:string}){
  if(!Number.isInteger(input.amount)||input.amount<=0)throw new LedgerError("LEDGER_INVALID_AMOUNT","Valor inválido.");
  const client=await pool.connect();
  try{
    await client.query("begin isolation level serializable");
    const userAccount=await ensureUserDiamondAccount(client,input.userId);
    if(await getLedgerBalance(client,userAccount)<input.amount)throw new LedgerError("INSUFFICIENT_BALANCE","Saldo insuficiente.");
    const sink=await ensureSystemDiamondAccount(client);
    const result=await postLedgerTransaction(client,{...input,entries:[
      {accountId:userAccount,direction:"debit",amount:input.amount},
      {accountId:sink,direction:"credit",amount:input.amount}
    ]});
    await client.query("commit");return result;
  }catch(error){await client.query("rollback");if((error as {code?:string}).code==="40001")throw new LedgerError("LEDGER_RETRY","Conflito concorrente. Tente novamente.");throw error;}
  finally{client.release();}
}

export async function creditDiamonds(input:{userId:string;amount:number;type:string;referenceType?:string;referenceId?:string;idempotencyKey:string}){
  if(!Number.isInteger(input.amount)||input.amount<=0)throw new LedgerError("LEDGER_INVALID_AMOUNT","Valor inválido.");
  const client=await pool.connect();
  try{
    await client.query("begin isolation level serializable");
    const userAccount=await ensureUserDiamondAccount(client,input.userId);
    const source=await ensureLedgerAccount(client,"system:diamonds:source","system",null);
    const result=await postLedgerTransaction(client,{...input,entries:[
      {accountId:source,direction:"debit",amount:input.amount},
      {accountId:userAccount,direction:"credit",amount:input.amount}
    ]});
    await client.query("commit");return result;
  }catch(error){await client.query("rollback");throw error;}finally{client.release();}
}
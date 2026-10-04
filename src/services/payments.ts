import { randomUUID } from "node:crypto";
import { pool } from "@/lib/db";
import { ensureLedgerAccount, ensureUserDiamondAccount, postLedgerTransaction } from "@/services/ledger";

export type VerifiedStorePurchase={
  provider:"apple"|"google";
  purchaserUserId:string;
  beneficiaryUserId?:string;
  purchaseIntentId?:string;
  storeProductId:string;
  externalTransactionId:string;
  currency?:string;
  amountMinor?:number;
  receiptHash?:string;
  metadata?:Record<string,unknown>;
};
export class PaymentError extends Error{constructor(public readonly code:string,message:string){super(message);}}

export async function fulfillVerifiedPurchase(p:VerifiedStorePurchase){
  const client=await pool.connect();
  try{
    await client.query("begin isolation level serializable");
    if(p.purchaseIntentId){
      const intent=await client.query<{
        purchaser_user_id:string;beneficiary_user_id:string;provider:string;product_type:string;sku:string;status:string;expires_at:Date;
      }>(
        "select purchaser_user_id,beneficiary_user_id,provider,product_type,sku,status,expires_at from purchase_intents where id=$1 for update",
        [p.purchaseIntentId]
      );
      const row=intent.rows[0];
      if(!row||row.status!=="created"||new Date(row.expires_at)<=new Date()||
        row.purchaser_user_id!==p.purchaserUserId||row.beneficiary_user_id!==(p.beneficiaryUserId??p.purchaserUserId)||
        row.provider!==p.provider){
        throw new PaymentError("PURCHASE_INTENT_INVALID","Intenção de compra inválida, expirada ou já consumida.");
      }
    }
    const existing=await client.query<{id:string;status:string}>(
      "select id,status from payments where provider=$1 and external_transaction_id=$2 for update",
      [p.provider,p.externalTransactionId]
    );
    if(existing.rowCount){await client.query("commit");return {paymentId:existing.rows[0].id,duplicate:true};}

    const product=await client.query<{id:string;sku:string;kind:"diamonds"|"vip";diamonds:number|null;bonus_diamonds:number|null;tier:string|null;duration_days:number|null}>(
      `select id,sku,'diamonds'::text kind,diamonds,bonus_diamonds,null::text tier,null::int duration_days
       from diamond_packages where is_active=true and store_product_ids->>$1=$2
       union all
       select id,code sku,'vip'::text kind,null::int diamonds,null::int bonus_diamonds,tier,duration_days
       from vip_plans where is_active=true and store_product_ids->>$1=$2
       limit 1`,
      [p.provider,p.storeProductId]
    );
    if(!product.rowCount)throw new PaymentError("UNKNOWN_STORE_PRODUCT","Produto da loja não reconhecido.");

    const item=product.rows[0],paymentId=randomUUID();
    await client.query(
      `insert into payments(id,user_id,provider,product_type,sku,external_transaction_id,status,currency,amount_minor,receipt_hash,raw_metadata,paid_at)
       values($1,$2,$3,$4,$5,$6,'paid',$7,$8,$9,$10,now())`,
      [paymentId,p.purchaserUserId,p.provider,item.kind,item.sku,p.externalTransactionId,p.currency??null,p.amountMinor??null,p.receiptHash??null,JSON.stringify({...p.metadata,purchaseIntentId:p.purchaseIntentId??null,beneficiaryUserId:p.beneficiaryUserId??p.purchaserUserId})]
    );

    if(item.kind==="diamonds"){
      const amount=(item.diamonds??0)+(item.bonus_diamonds??0);
      if(amount<=0)throw new PaymentError("INVALID_DIAMOND_PACKAGE","Pacote de Diamantes inválido.");
      if(p.beneficiaryUserId&&p.beneficiaryUserId!==p.purchaserUserId)throw new PaymentError("DIAMONDS_NOT_GIFTABLE","Pacotes de Diamantes não podem ser redirecionados.");
      const userAccount=await ensureUserDiamondAccount(client,p.purchaserUserId);
      const source=await ensureLedgerAccount(client,"system:diamonds:source","system",null);
      await postLedgerTransaction(client,{
        type:"diamond_purchase",referenceType:"payment",referenceId:paymentId,
        idempotencyKey:`payment:${p.provider}:${p.externalTransactionId}`,
        entries:[{accountId:source,direction:"debit",amount},{accountId:userAccount,direction:"credit",amount}]
      });
    }else{
      if(!item.tier||!item.duration_days)throw new PaymentError("INVALID_VIP_PLAN","Plano VIP inválido.");
      const current=await client.query<{end_at:Date}>(
        "select max(ends_at) end_at from vip_subscriptions where user_id=$1 and status in ('active','grace_period') and ends_at>now()",
        [p.beneficiaryUserId??p.purchaserUserId]
      );
      const base=current.rows[0]?.end_at&&new Date(current.rows[0].end_at)>new Date()?new Date(current.rows[0].end_at):new Date();
      const endsAt=new Date(base.getTime()+item.duration_days*86400000);
      await client.query(
        `insert into vip_subscriptions(id,user_id,plan,status,provider,external_id,starts_at,ends_at)
         values($1,$2,$3,'active',$4,$5,$6,$7)`,
        [randomUUID(),p.beneficiaryUserId??p.purchaserUserId,item.tier,p.provider,p.externalTransactionId,base,endsAt]
      );
      const beneficiary=p.beneficiaryUserId??p.purchaserUserId;
      await client.query("update profiles set is_vip=true,updated_at=now() where user_id=$1",[beneficiary]);
      if(beneficiary!==p.purchaserUserId){
        await client.query(
          "insert into vip_gifts(id,sender_id,receiver_id,plan_id,payment_id,starts_at,ends_at) values($1,$2,$3,$4,$5,$6,$7)",
          [randomUUID(),p.purchaserUserId,beneficiary,item.id,paymentId,base,endsAt]
        );
      }
    }

    if(p.purchaseIntentId){
      await client.query("update purchase_intents set status='consumed',consumed_at=now() where id=$1",[p.purchaseIntentId]);
    }
    await client.query("commit");
    return {paymentId,duplicate:false,productType:item.kind,sku:item.sku};
  }catch(error){
    await client.query("rollback");
    if(error instanceof PaymentError)throw error;
    const pg=error as {code?:string};
    if(pg.code==="40001")throw new PaymentError("PAYMENT_RETRY","Conflito concorrente. Tente novamente.");
    if(pg.code==="23505")throw new PaymentError("PAYMENT_DUPLICATE","Transação já processada.");
    throw error;
  }finally{client.release();}
}
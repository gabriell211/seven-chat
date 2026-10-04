import { and, eq, sql } from "drizzle-orm";
import { AppShell } from "@/components/app-shell";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { gifts, ledgerAccounts, ledgerEntries } from "@/db/schema";
export const dynamic="force-dynamic";
export default async function WalletPage(){
  const session=await getSession();
  if(!session)return <AppShell><div className="card empty">Entre para acessar sua carteira.</div></AppShell>;
  const rows=await db.select({
    balance:sql<number>`coalesce(sum(case when ${ledgerEntries.direction}='credit' then ${ledgerEntries.amount} else -${ledgerEntries.amount} end),0)`
  }).from(ledgerAccounts).leftJoin(ledgerEntries,eq(ledgerEntries.accountId,ledgerAccounts.id))
    .where(and(eq(ledgerAccounts.ownerId,session.userId),eq(ledgerAccounts.asset,"diamonds")));
  const catalog=await db.select({id:gifts.id,name:gifts.name,priceDiamonds:gifts.priceDiamonds,category:gifts.category})
    .from(gifts).where(eq(gifts.isActive,true)).limit(30);
  const balance=Number(rows[0]?.balance??0);
  return <AppShell><div className="grid two">
    <section className="card"><h2>Carteira</h2><div className="metric"><span className="muted">Saldo</span><strong>💎 {balance}</strong></div><p className="muted">Saldo derivado do ledger; nenhuma alteração financeira é aceita diretamente do frontend.</p></section>
    <section className="card"><h3>Presentes</h3><div className="stack">{catalog.length?catalog.map(g=><div key={g.id} style={{display:"flex",justifyContent:"space-between",gap:12}}><span>{g.name}<small className="muted"> · {g.category}</small></span><strong>💎 {g.priceDiamonds}</strong></div>):<p className="muted">Nenhum gift ativo no catálogo.</p>}</div></section>
  </div></AppShell>;
}
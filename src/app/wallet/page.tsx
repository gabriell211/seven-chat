import { and, eq, sql } from "drizzle-orm";
import { AppShell } from "@/components/app-shell";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { gifts, ledgerAccounts, ledgerEntries } from "@/db/schema";

export const dynamic="force-dynamic";

export default async function WalletPage(){
  const session=await getSession();
  if(!session)return <AppShell><div className="card empty"><div><div className="empty-icon">◇</div><strong>Entre para acessar sua carteira.</strong><p>Saldo, presentes e movimentações ficam vinculados à sua conta.</p><a className="button compact" href="/login">Entrar</a></div></div></AppShell>;

  const rows=await db.select({
    balance:sql<number>`coalesce(sum(case when ${ledgerEntries.direction}='credit' then ${ledgerEntries.amount} else -${ledgerEntries.amount} end),0)`
  }).from(ledgerAccounts).leftJoin(ledgerEntries,eq(ledgerEntries.accountId,ledgerAccounts.id))
    .where(and(eq(ledgerAccounts.ownerId,session.userId),eq(ledgerAccounts.asset,"diamonds")));

  const catalog=await db.select({id:gifts.id,name:gifts.name,priceDiamonds:gifts.priceDiamonds,category:gifts.category})
    .from(gifts).where(eq(gifts.isActive,true)).limit(30);

  const balance=Number(rows[0]?.balance??0);

  return <AppShell>
    <div className="page-heading">
      <div><span className="eyebrow">CARTEIRA</span><h1>Seus diamantes</h1><p className="muted">Saldo derivado do ledger e protegido contra alteração direta pelo frontend.</p></div>
      <span className="pill">@{session.username}</span>
    </div>
    <div className="grid two">
      <section className="grid">
        <div className="wallet-balance card">
          <span className="eyebrow">SALDO DISPONÍVEL</span>
          <strong>◇ {balance.toLocaleString("pt-BR")}</strong>
          <p>Use diamantes em gifts e recursos elegíveis dentro da plataforma.</p>
        </div>
        <div className="card soft">
          <h3>Segurança da carteira</h3>
          <p className="muted" style={{lineHeight:1.6}}>As mudanças financeiras são registradas pelo ledger do servidor. O navegador não consegue alterar o saldo diretamente.</p>
        </div>
      </section>
      <section className="card">
        <div className="row between" style={{marginBottom:14}}><div><span className="eyebrow">CATÁLOGO</span><h3 style={{margin:"5px 0 0"}}>Presentes</h3></div><span className="pill">{catalog.length}</span></div>
        <div className="gift-list">{catalog.length?catalog.map(g=><div key={g.id} className="gift-item"><div className="gift-icon">◇</div><div><strong>{g.name}</strong><span>{g.category}</span></div><b>◇ {g.priceDiamonds}</b></div>):<p className="muted">Nenhum gift ativo no catálogo.</p>}</div>
      </section>
    </div>
  </AppShell>;
}
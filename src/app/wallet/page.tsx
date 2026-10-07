import { and, asc, eq, sql } from "drizzle-orm";
import { AppShell } from "@/components/app-shell";
import { CheckoutButton } from "@/components/checkout-button";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { diamondPackages, gifts, ledgerAccounts, ledgerEntries } from "@/db/schema";

export const dynamic="force-dynamic";

export default async function WalletPage(){
  const session=await getSession();
  if(!session)return <AppShell><div className="card empty"><div><div className="empty-icon">◇</div><strong>Entre para acessar sua carteira.</strong><p>Saldo, presentes e movimentações ficam vinculados à sua conta.</p><a className="button compact" href="/login">Entrar</a></div></div></AppShell>;

  const [rows,catalog,packages]=await Promise.all([
    db.select({
      balance:sql<number>`coalesce(sum(case when ${ledgerEntries.direction}='credit' then ${ledgerEntries.amount} else -${ledgerEntries.amount} end),0)`
    }).from(ledgerAccounts).leftJoin(ledgerEntries,eq(ledgerEntries.accountId,ledgerAccounts.id))
      .where(and(eq(ledgerAccounts.ownerId,session.userId),eq(ledgerAccounts.asset,"diamonds"))),
    db.select({id:gifts.id,name:gifts.name,priceDiamonds:gifts.priceDiamonds,category:gifts.category})
      .from(gifts).where(eq(gifts.isActive,true)).limit(30),
    db.select({
      sku:diamondPackages.sku,diamonds:diamondPackages.diamonds,bonusDiamonds:diamondPackages.bonusDiamonds,
      currency:diamondPackages.currency,priceMinor:diamondPackages.priceMinor
    }).from(diamondPackages).where(eq(diamondPackages.isActive,true)).orderBy(asc(diamondPackages.priceMinor)).limit(12)
  ]);

  const balance=Number(rows[0]?.balance??0);

  return <AppShell>
    <div className="page-heading">
      <div><span className="eyebrow">CARTEIRA</span><h1>Seus diamantes</h1><p className="muted">Saldo calculado pelo ledger real e compras processadas pela InfinitePay.</p></div>
      <span className="pill">@{session.username}</span>
    </div>

    <div className="grid two">
      <section className="grid">
        <div className="wallet-balance card">
          <span className="eyebrow">SALDO DISPONÍVEL</span>
          <strong>◇ {balance.toLocaleString("pt-BR")}</strong>
          <p>O saldo é derivado das entradas do ledger. O navegador não altera esse número diretamente.</p>
        </div>

        <div className="card">
          <div className="row between" style={{marginBottom:14}}><div><span className="eyebrow">COMPRAR</span><h3 style={{margin:"5px 0 0"}}>Pacotes de diamantes</h3></div><span className="pill">{packages.length}</span></div>
          {packages.length?<div className="diamond-packages">{packages.map(pkg=><article className="diamond-package" key={pkg.sku}>
            <div><strong>◇ {(pkg.diamonds+pkg.bonusDiamonds).toLocaleString("pt-BR")}</strong>{pkg.bonusDiamonds>0&&<span>+{pkg.bonusDiamonds} bônus</span>}</div>
            <b>{(pkg.priceMinor/100).toLocaleString("pt-BR",{style:"currency",currency:pkg.currency})}</b>
            <CheckoutButton productType="diamonds" sku={pkg.sku} label="Comprar"/>
          </article>)}</div>:<p className="muted">Nenhum pacote ativo no catálogo.</p>}
        </div>
      </section>

      <section className="card">
        <div className="row between" style={{marginBottom:14}}><div><span className="eyebrow">CATÁLOGO</span><h3 style={{margin:"5px 0 0"}}>Presentes</h3></div><span className="pill">{catalog.length}</span></div>
        <div className="gift-list">{catalog.length?catalog.map(g=><div key={g.id} className="gift-item"><div className="gift-icon">◇</div><div><strong>{g.name}</strong><span>{g.category}</span></div><b>◇ {g.priceDiamonds}</b></div>):<p className="muted">Nenhum gift ativo no catálogo.</p>}</div>
      </section>
    </div>
  </AppShell>;
}

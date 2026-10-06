import { asc, eq } from "drizzle-orm";
import { AppShell } from "@/components/app-shell";
import { db } from "@/lib/db";
import { vipPlans } from "@/db/schema";

export const dynamic="force-dynamic";

export default async function Vip(){
  const plans=process.env.DATABASE_URL?await db.select().from(vipPlans).where(eq(vipPlans.isActive,true)).orderBy(asc(vipPlans.priceMinor)).limit(12).catch(()=>[]):[];

  return <AppShell>
    <div className="page-heading">
      <div><span className="eyebrow">SEVEN VIP</span><h1>Mais presença. Mais personalidade.</h1><p className="muted">Planos ativos validados pelo servidor, com benefícios vinculados à sua conta.</p></div>
      <span className="vip-badge">PREMIUM</span>
    </div>

    <section className="vip-hero card">
      <div><span className="eyebrow">EXPERIÊNCIA PREMIUM</span><h2>Deixe seu perfil com a sua cara.</h2><p className="muted">Recursos VIP ampliam personalização e experiências sociais sem mudar a segurança das transações.</p></div>
      <div className="vip-orb">◆</div>
    </section>

    {plans.length?<div className="plan-grid">{plans.map(plan=><article className="plan-card" key={plan.id}>
      <span className="eyebrow">{plan.tier.toUpperCase()}</span>
      <h3>{plan.code}</h3>
      <div className="plan-price">{(plan.priceMinor/100).toLocaleString("pt-BR",{style:"currency",currency:plan.currency})}<small> / {plan.durationDays} dias</small></div>
      <div className="stack" style={{gap:8}}>
        <span className="plan-benefit">✓ Entitlement validado no servidor</span>
        <span className="plan-benefit">✓ Identidade visual premium</span>
        <span className="plan-benefit">✓ Benefícios ligados à conta</span>
      </div>
      <span className="button secondary full" aria-disabled="true">Disponível pela loja</span>
    </article>)}</div>:<div className="card empty"><div><div className="empty-icon">◆</div><strong>Planos em preparação.</strong><p>Quando os planos ativos forem publicados no catálogo, eles aparecerão aqui.</p></div></div>}
  </AppShell>;
}
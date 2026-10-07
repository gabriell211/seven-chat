import { AppShell } from "@/components/app-shell";
import { CheckoutButton } from "@/components/checkout-button";
import { getSevenVipPlans, SEVEN_VIP_30D, SEVEN_VIP_MONTHLY } from "@/services/vip-catalog";

export const dynamic="force-dynamic";

const benefits=[
  "Selo Seven VIP no perfil",
  "Acesso a salas exclusivas VIP",
  "Envio de vídeo no chat",
  "Criação de grupos privados",
  "Benefícios vinculados à conta em qualquer dispositivo"
];

export default async function Vip(){
  const plans=await getSevenVipPlans().catch(()=>[]);
  const monthly=plans.find(plan=>plan.code===SEVEN_VIP_MONTHLY);
  const oneTime=plans.find(plan=>plan.code===SEVEN_VIP_30D);

  return <AppShell>
    <div className="page-heading">
      <div>
        <span className="eyebrow">SEVEN VIP</span>
        <h1>Mais recursos por menos.</h1>
        <p className="muted">Duas formas de ter o mesmo Seven VIP: assinatura mensal ou 30 dias avulsos.</p>
      </div>
      <span className="vip-badge">VIP</span>
    </div>

    <section className="vip-offer-hero">
      <div>
        <span className="eyebrow">OFERTA PRINCIPAL</span>
        <h2>Seven VIP Mensal</h2>
        <p>Tenha os recursos premium do Seven Chat por <strong>R$ 23,90 por mês</strong>.</p>
        <div className="vip-offer-price">
          <strong>R$ 23,90</strong><span>/mês</span>
        </div>
        <div className="vip-save-chip">Economize R$ 16,00 em relação ao passe avulso</div>
      </div>
      <div className="vip-crown">◆</div>
    </section>

    <div className="vip-pricing-grid">
      <article className="vip-price-card is-featured">
        <div className="vip-plan-top">
          <div>
            <span className="vip-plan-label">MAIS VANTAJOSO</span>
            <h3>VIP Mensal</h3>
          </div>
          <span className="vip-plan-badge">Assinatura</span>
        </div>

        <div className="vip-plan-price">
          <strong>{monthly?(monthly.priceMinor/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}):"R$ 23,90"}</strong>
          <span>/ mês</span>
        </div>

        <p className="muted">Renovação mensal pelas lojas mobile. Você pode cancelar a assinatura pela própria loja.</p>

        <div className="vip-benefits">
          {benefits.map(item=><span key={item}>✓ {item}</span>)}
        </div>

        <div className="vip-store-cta" aria-disabled="true">
          <strong>Assinatura mensal</strong>
          <span>Disponível no app iOS/Android quando o produto da loja estiver publicado.</span>
        </div>
      </article>

      <article className="vip-price-card">
        <div className="vip-plan-top">
          <div>
            <span className="eyebrow">SEM RENOVAÇÃO</span>
            <h3>VIP 30 dias</h3>
          </div>
          <span className="pill">Avulso</span>
        </div>

        <div className="vip-plan-price">
          <strong>{oneTime?(oneTime.priceMinor/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}):"R$ 39,90"}</strong>
          <span>/ 30 dias</span>
        </div>

        <p className="muted">Pagamento único. O VIP termina após 30 dias e não renova automaticamente.</p>

        <div className="vip-benefits">
          {benefits.map(item=><span key={item}>✓ {item}</span>)}
        </div>

        {oneTime
          ?<CheckoutButton productType="vip" sku={oneTime.code} label="Comprar 30 dias por R$ 39,90"/>
          :<div className="error">Plano avulso temporariamente indisponível.</div>}
      </article>
    </div>

    <section className="card vip-compare-note">
      <div>
        <span className="eyebrow">MESMO VIP, DUAS FORMAS</span>
        <h3>Os benefícios são iguais.</h3>
        <p className="muted">A diferença é só a cobrança: o mensal custa menos e renova pela loja; o passe de 30 dias é uma compra única pelo checkout web.</p>
      </div>
      <div className="vip-compare-values">
        <span><b>R$ 23,90</b><small>mensal</small></span>
        <span><b>R$ 39,90</b><small>avulso</small></span>
      </div>
    </section>
  </AppShell>;
}

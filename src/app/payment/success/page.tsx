import Link from "next/link";

export default async function PaymentSuccess({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const p=await searchParams;
  const method=typeof p.capture_method==="string"?p.capture_method:"pagamento";
  return <main className="payment-page">
    <section className="payment-card">
      <div className="payment-check">✓</div>
      <span className="eyebrow">PAGAMENTO RECEBIDO</span>
      <h1>Confirmação em andamento.</h1>
      <p>Seu {method==="pix"?"Pix":"pagamento"} foi enviado para confirmação. Assim que a InfinitePay confirmar, as gemas ou o VIP serão liberados automaticamente no Seven Chat.</p>
      <div className="payment-status"><span className="status-dot"/><span>Processamento automático pelo servidor</span></div>
      <Link className="button full" href="/wallet">Voltar para a carteira</Link>
      <Link className="button ghost full" href="/">Ir para o início</Link>
    </section>
  </main>;
}
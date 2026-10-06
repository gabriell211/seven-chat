import Link from "next/link";
import { LEGAL_VERSION } from "@/lib/legal";

export default function Privacy(){
  return <main className="legal-page">
    <div className="legal-wrap">
      <header className="legal-top"><Link href="/" className="legal-brand">Seven <strong>Chat</strong></Link><Link href="/register" className="button secondary compact">Voltar</Link></header>
      <article className="legal-card">
        <div className="legal-hero"><span className="eyebrow">DOCUMENTO LEGAL</span><h1>Política de Privacidade</h1><p>Como o Seven Chat trata dados, segurança e controles da sua conta.</p><span className="pill">Versão {LEGAL_VERSION}</span></div>
        <div className="legal-body">
          <section><h2>Dados utilizados</h2><p>Tratamos dados de conta, perfil, preferências, relações sociais, conteúdo enviado, sessões/dispositivos, eventos de segurança e registros necessários para compras e economia virtual.</p></section>
          <section><h2>Finalidades</h2><p>Os dados são usados para autenticação, funcionamento do serviço, segurança, moderação, prevenção de fraude, suporte, entrega de compras, notificações e melhoria operacional.</p></section>
          <section><h2>Mídia privada</h2><p>Uploads privados usam armazenamento não público e acesso temporário assinado. Mídias de visualização única possuem controle de abertura no servidor, mas nenhum aplicativo pode impedir integralmente captura externa por outro dispositivo.</p></section>
          <section><h2>Compartilhamento</h2><p>Provedores de infraestrutura, pagamento, loja, entrega de e-mail, push, storage e RTC recebem apenas os dados necessários à prestação do serviço. Não vendemos dados pessoais como parte do funcionamento planejado do Seven Chat.</p></section>
          <section><h2>Seus controles</h2><p>Nas configurações você pode revisar sessões, solicitar uma exportação e agendar a exclusão da conta. A exclusão possui janela de cancelamento antes do processamento.</p></section>
          <section><h2>Retenção e segurança</h2><p>Dados são mantidos pelo tempo necessário à finalidade, segurança e obrigações aplicáveis. Registros financeiros imutáveis podem permanecer associados apenas a identificadores internos após anonimização da conta.</p></section>
          <section><h2>Menores</h2><p>O serviço aceita usuários a partir de 13 anos e aplica as exigências legais e de loja que forem obrigatórias na região de uso.</p></section>
          <div className="legal-note">Esta política técnica deve passar por revisão jurídica e regulatória antes da publicação comercial.</div>
        </div>
      </article>
    </div>
  </main>;
}
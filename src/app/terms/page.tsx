import { LEGAL_VERSION } from "@/lib/legal";
export default function Terms(){
  return <main className="main"><article className="card stack" style={{maxWidth:820,margin:"40px auto"}}>
    <div><h1>Termos de Uso do Seven Chat</h1><p className="muted">Versão {LEGAL_VERSION}</p></div>
    <p>O Seven Chat é uma plataforma social para pessoas entre 13 e 99 anos. Ao criar uma conta, você concorda em fornecer informações verdadeiras, proteger suas credenciais e respeitar as regras da comunidade.</p>
    <h2>Conteúdo e conduta</h2><p>Você é responsável pelo conteúdo que publica ou envia. Não é permitido assédio, fraude, exploração sexual, violência ilícita, discurso de ódio, impersonação maliciosa, spam ou conteúdo que viole direitos de terceiros.</p>
    <h2>Economia virtual</h2><p>Diamantes e benefícios digitais são itens de consumo dentro do Seven Chat. Preços, disponibilidade, reembolsos e compras seguem também as regras da loja ou provedor utilizado. Saldo virtual não representa depósito bancário e não é transferível por padrão.</p>
    <h2>Moderação</h2><p>Conteúdo e contas podem ser restringidos, removidos ou suspensos quando houver violação das regras, risco à comunidade, fraude ou obrigação legal. Recursos de bloqueio e denúncia permanecem disponíveis independentemente de assinatura.</p>
    <h2>Encerramento</h2><p>Você pode solicitar exportação e exclusão da conta nas configurações. Determinados registros financeiros ou de segurança podem ser retidos quando houver obrigação legítima de auditoria, fraude, disputa ou cumprimento legal.</p>
    <h2>Alterações</h2><p>Mudanças materiais nos Termos recebem nova versão e, quando necessário, exigem novo aceite.</p>
    <p className="muted">Este texto é a política operacional do produto e deve passar por revisão jurídica antes do lançamento comercial em cada região.</p>
  </article></main>;
}
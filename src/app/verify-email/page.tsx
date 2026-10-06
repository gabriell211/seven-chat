import { AuthShell } from "@/components/auth-shell";

export default async function VerifyEmailPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const p=await searchParams;
  const token=typeof p.token==="string"?p.token:"";
  const email=typeof p.email==="string"?p.email:"";
  return <AuthShell eyebrow="CONFIRMAÇÃO" title="Verifique seu e-mail." description="Essa confirmação protege sua conta e libera o acesso completo ao Seven Chat.">
    {p.success&&<div className="success">E-mail confirmado. Sua conta está pronta para entrar.</div>}
    {p.error&&<div className="error">O link é inválido ou expirou.</div>}
    {p.delivery==="failed"&&<div className="error">A conta foi criada, mas o e-mail de confirmação não pôde ser enviado. Tente novamente abaixo.</div>}
    {p.delivery==="sent"&&<div className="success">E-mail enviado. Confira também spam e promoções.</div>}
    {token?<form className="stack" action="/api/auth/verify-email" method="post"><input type="hidden" name="token" value={token}/><button className="button full">Confirmar meu e-mail</button></form>:<>
      <div className="card soft"><strong>Não encontrou a mensagem?</strong><p className="muted" style={{marginBottom:0,fontSize:13}}>Você pode pedir um novo link de confirmação abaixo.</p></div>
      <form className="stack" action="/api/auth/resend-verification" method="post">
        <label className="field"><span>Seu e-mail</span><input className="input" type="email" name="email" defaultValue={email} placeholder="voce@exemplo.com" required/></label>
        <button className="button secondary full">Reenviar confirmação</button>
      </form>
    </>}
    <a className="button ghost full" href="/login">Voltar ao login</a>
  </AuthShell>;
}
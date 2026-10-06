import { AuthShell } from "@/components/auth-shell";

export default async function ForgotPassword({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const p=await searchParams;
  return <AuthShell eyebrow="SEGURANÇA" title="Recupere seu acesso." description="Informe seu e-mail ou usuário. Se a conta existir, enviaremos um link válido por 1 hora.">
    {p.sent&&<div className="success">Confira seu e-mail para continuar.</div>}
    <form className="stack" action="/api/auth/password-reset/request" method="post">
      <label className="field"><span>E-mail ou @usuário</span><input className="input" name="identifier" placeholder="Identifique sua conta" required/></label>
      <button className="button full">Enviar link de recuperação</button>
    </form>
    <a className="button secondary full" href="/login">Voltar ao login</a>
  </AuthShell>;
}
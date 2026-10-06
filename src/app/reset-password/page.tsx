import { AuthShell } from "@/components/auth-shell";

export default async function ResetPassword({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const p=await searchParams,token=typeof p.token==="string"?p.token:"";
  return <AuthShell eyebrow="SEGURANÇA" title="Crie uma nova senha." description="Use pelo menos 10 caracteres e escolha algo que você não usa em outros serviços.">
    {p.error&&<div className="error">Link inválido, expirado ou senha fora dos requisitos.</div>}
    {p.success?<><div className="success">Senha alterada com sucesso.</div><a className="button full" href="/login">Entrar no Seven Chat</a></>:<form className="stack" action="/api/auth/password-reset/confirm" method="post">
      <input type="hidden" name="token" value={token}/>
      <label className="field"><span>Nova senha</span><input className="input" type="password" name="password" minLength={10} maxLength={128} placeholder="Digite sua nova senha" required/></label>
      <button className="button full">Alterar senha</button>
    </form>}
  </AuthShell>;
}
import Link from "next/link";
import { getOAuthPending } from "@/lib/auth";
import { AuthShell } from "@/components/auth-shell";

export default async function RegisterPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const p=await searchParams;
  const oauth=await getOAuthPending();
  return <AuthShell
    eyebrow="CRIAR CONTA"
    title="Seu espaço começa aqui."
    description="Monte seu perfil e entre na comunidade. Cadastro permitido entre 13 e 99 anos."
    footer={<>Já tem conta? <Link href="/login"><strong>Entrar</strong></Link></>}
  >
    {p.error&&<div className="error">Não foi possível concluir o cadastro. Revise os campos e tente novamente.</div>}
    {oauth&&<div className="success">Google conectado · {oauth.email}</div>}
    <form className="stack" action="/api/auth/register" method="post">
      <label className="field"><span>Nome</span><input className="input" name="displayName" placeholder="Como quer aparecer" defaultValue={oauth?.name??""} minLength={2} maxLength={60} required/></label>
      <label className="field"><span>Usuário</span><input className="input" name="username" placeholder="@seuusuario" minLength={3} maxLength={24} pattern="[A-Za-z0-9_.]+" required/></label>
      {!oauth&&<label className="field"><span>E-mail</span><input className="input" type="email" name="email" placeholder="voce@exemplo.com" required/></label>}
      <label className="field"><span>Data de nascimento</span><input className="input" type="date" name="birthDate" required/></label>
      {!oauth&&<label className="field"><span>Senha</span><input className="input" type="password" name="password" placeholder="Mínimo de 10 caracteres" minLength={10} required/></label>}
      <label className="legal-check"><input type="checkbox" name="termsAccepted" required/><span className="muted">Li e aceito os <Link href="/terms"><strong>Termos de Uso</strong></Link> e a <Link href="/privacy"><strong>Política de Privacidade</strong></Link>.</span></label>
      <button className="button full">Criar minha conta</button>
    </form>
  </AuthShell>;
}
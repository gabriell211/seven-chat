import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";

export default async function LoginPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const p=await searchParams;
  return <AuthShell
    eyebrow="ACESSAR CONTA"
    title="Que bom ter você de volta."
    description="Entre para continuar suas conversas e acompanhar tudo o que está acontecendo."
    footer={<>Ainda não tem conta? <Link href="/register"><strong>Criar conta</strong></Link></>}
  >
    {p.error&&<div className="error">Não foi possível entrar. Confira seu e-mail, usuário e senha.</div>}
    <form className="stack" action="/api/auth/login" method="post">
      <label className="field"><span>E-mail ou @usuário</span><input className="input" name="identifier" autoComplete="username" placeholder="voce@exemplo.com" required/></label>
      <label className="field"><span>Senha</span><input className="input" type="password" name="password" autoComplete="current-password" placeholder="Sua senha" required/></label>
      <div className="row between"><span className="muted" style={{fontSize:12}}>Acesso protegido</span><Link href="/forgot-password" style={{fontSize:12,fontWeight:800,color:"#cbb8ff"}}>Esqueci minha senha</Link></div>
      <button className="button full">Entrar</button>
    </form>
    <div className="auth-divider">ou</div>
    <a className="button google-button full" href="/api/auth/google/start">Continuar com Google</a>
  </AuthShell>;
}
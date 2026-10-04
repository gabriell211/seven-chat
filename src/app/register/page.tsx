import Link from "next/link";
import { getOAuthPending } from "@/lib/auth";
export default async function RegisterPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const p=await searchParams;
  const oauth=await getOAuthPending();
  return <main className="auth"><section className="authbox stack">
    <div><h1>Criar conta</h1><p className="muted">Cadastro permitido entre 13 e 99 anos.</p></div>
    {p.error&&<div className="error">Não foi possível concluir o cadastro.</div>}
    {oauth&&<div className="pill">Google verificado · {oauth.email}</div>}
    <form className="stack" action="/api/auth/register" method="post">
      <input className="input" name="displayName" placeholder="Nome" defaultValue={oauth?.name??""} minLength={2} maxLength={60} required/>
      <input className="input" name="username" placeholder="@usuário" minLength={3} maxLength={24} pattern="[A-Za-z0-9_.]+" required/>
      {!oauth&&<input className="input" type="email" name="email" placeholder="E-mail" required/>}
      <input className="input" type="date" name="birthDate" required/>
      {!oauth&&<input className="input" type="password" name="password" placeholder="Senha (mín. 10 caracteres)" minLength={10} required/>}
      <button className="button">Criar conta</button>
    </form>
    <p className="muted">Já tem conta? <Link href="/login"><strong>Entrar</strong></Link></p>
  </section></main>;
}
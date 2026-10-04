export default async function VerifyEmailPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const p=await searchParams;
  const token=typeof p.token==="string"?p.token:"";
  const email=typeof p.email==="string"?p.email:"";
  return <main className="auth"><section className="authbox stack">
    <div><h1>Verifique seu e-mail</h1><p className="muted">A conta só é liberada depois da confirmação do endereço de e-mail.</p></div>
    {p.success&&<div className="success">E-mail confirmado. Você já pode entrar.</div>}
    {p.error&&<div className="error">O link é inválido ou expirou.</div>}
    {token?<form className="stack" action="/api/auth/verify-email" method="post"><input type="hidden" name="token" value={token}/><button className="button">Confirmar e-mail</button></form>:<>
      <p className="muted">Confira sua caixa de entrada e também o spam.</p>
      <form className="stack" action="/api/auth/resend-verification" method="post">
        <input className="input" type="email" name="email" defaultValue={email} placeholder="Seu e-mail" required/>
        <button className="button secondary">Reenviar confirmação</button>
      </form>
    </>}
    <a className="button secondary" href="/login">Voltar ao login</a>
  </section></main>;
}
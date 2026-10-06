import Link from "next/link";

function BrandMark(){
  return <span className="brand-mark" aria-hidden="true"><span/><span/><span/></span>;
}

export function AuthShell({
  eyebrow="BEM-VINDO",
  title,
  description,
  children,
  footer
}:{
  eyebrow?:string;
  title:string;
  description:string;
  children:React.ReactNode;
  footer?:React.ReactNode;
}){
  return <main className="auth">
    <section className="auth-layout">
      <aside className="auth-hero">
        <Link href="/" className="auth-brand"><BrandMark/><span>Seven Chat</span></Link>
        <div className="auth-hero-copy">
          <span className="eyebrow">CONECTE · CONVERSE · CRIE</span>
          <h2>Mais perto de quem combina com você.</h2>
          <p>Chat, salas de voz, lives, reels e comunidades em uma experiência social rápida, privada e feita para funcionar bem em qualquer tela.</p>
        </div>
        <div className="auth-badges">
          <span className="auth-badge">● Chat em tempo real</span>
          <span className="auth-badge">● Salas de voz</span>
          <span className="auth-badge">● Lives e Reels</span>
        </div>
      </aside>
      <div className="auth-panel">
        <section className="authbox stack">
          <div>
            <span className="eyebrow">{eyebrow}</span>
            <h1>{title}</h1>
            <p className="muted">{description}</p>
          </div>
          {children}
          {footer&&<div className="auth-footer muted">{footer}</div>}
        </section>
      </div>
    </section>
  </main>;
}

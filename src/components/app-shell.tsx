import Link from "next/link";
import { getSession } from "@/lib/auth";
import { SideNav } from "@/components/side-nav";

function BrandMark(){
  return <span className="brand-mark" aria-hidden="true"><span/><span/><span/></span>;
}

function TopIcon({kind}:{kind:"bell"|"settings"}){
  if(kind==="bell")return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>;
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-4v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1A1.7 1.7 0 0 0 4.6 15 1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V3h4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1v4H21a1.7 1.7 0 0 0-1.6 1z"/></svg>;
}

export async function AppShell({children}:{children:React.ReactNode}){
  const session=await getSession();

  return <div className="shell">
    <aside className="sidebar">
      <Link href="/" className="brand" aria-label="Seven Chat">
        <BrandMark/>
        <span className="brand-copy"><b>Seven</b><strong>Chat</strong></span>
      </Link>
      <SideNav/>
      <div className="sidebar-footer">
        <div className="sidebar-promo">
          <span className="eyebrow">SEVEN VIP</span>
          <strong>Destaque seu perfil</strong>
          <small>Mais personalização e recursos sociais.</small>
          <Link href="/vip">Conhecer VIP</Link>
        </div>
      </div>
    </aside>

    <main className="main">
      <header className="topbar">
        <div className="topbar-copy">
          <span className="topbar-kicker">Seven Chat</span>
          <strong>{session?"Olá, @"+session.username:"Sua comunidade, do seu jeito"}</strong>
        </div>
        <div className="topbar-actions">
          {session&&<>
            <Link className="icon-button" href="/notifications" aria-label="Notificações"><TopIcon kind="bell"/></Link>
            <Link className="icon-button" href="/settings" aria-label="Configurações"><TopIcon kind="settings"/></Link>
          </>}
          {session?
            <form action="/api/auth/logout" method="post"><button className="button secondary compact">Sair</button></form>
            :<Link className="button compact" href="/login">Entrar</Link>
          }
        </div>
      </header>
      <div className="page-content">{children}</div>
    </main>
  </div>;
}

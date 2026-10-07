import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

function BrandMark(){
  return <span className="brand-mark" aria-hidden="true"><span/><span/><span/></span>;
}

const features=[
  {icon:"✦",title:"Feed social",text:"Publique, descubra pessoas e acompanhe tudo o que acontece na comunidade."},
  {icon:"▶",title:"Reels",text:"Vídeos curtos em uma experiência imersiva, rápida e feita para descoberta."},
  {icon:"◉",title:"Lives",text:"Transmissões ao vivo com convidados, gifts, batalhas, moderação e interação em tempo real."},
  {icon:"⌁",title:"Salas de voz",text:"Entre para ouvir, conversar ou subir ao palco em salas públicas, privadas ou VIP."},
  {icon:"✉",title:"Chat completo",text:"Mensagens privadas, grupos, mídia, chamadas e recursos sociais em um só lugar."},
  {icon:"◆",title:"VIP & gifts",text:"Personalização premium, gemas, presentes e reconhecimento para quem mais participa."}
];

export default async function LandingPage(){
  const session=await getSession();
  if(session)redirect("/feed");

  return <main className="landing">
    <header className="landing-nav">
      <Link href="/" className="landing-brand"><BrandMark/><span>Seven <strong>Chat</strong></span></Link>
      <nav className="landing-links">
        <a href="#recursos">Recursos</a>
        <a href="#live">Lives</a>
        <a href="#seguranca">Segurança</a>
      </nav>
      <div className="landing-actions">
        <Link className="button ghost compact" href="/login">Entrar</Link>
        <Link className="button compact" href="/register">Criar conta</Link>
      </div>
    </header>

    <section className="landing-hero">
      <div className="landing-hero-copy">
        <span className="eyebrow">UMA REDE SOCIAL COMPLETA</span>
        <h1>Converse. Descubra. Entre ao vivo. Faça parte.</h1>
        <p>Seven Chat reúne feed, perfis, reels, chat, salas de voz, lives, gifts e comunidades em uma experiência social moderna e feita para funcionar bem no desktop e no celular.</p>
        <div className="landing-cta">
          <Link className="button" href="/register">Começar agora</Link>
          <Link className="button secondary" href="/login">Já tenho conta</Link>
        </div>
        <div className="landing-trust">
          <span>● Chat em tempo real</span>
          <span>● Lives e salas</span>
          <span>● Perfis e comunidades</span>
        </div>
      </div>

      <div className="landing-phone-wrap" aria-label="Prévia ilustrativa do Seven Chat">
        <span className="landing-demo-label">DEMONSTRAÇÃO VISUAL</span>
        <div className="landing-glow"/>
        <div className="landing-phone">
          <div className="phone-top"><span>Seven Chat</span><span className="live-chip">AO VIVO</span></div>
          <div className="phone-story-row">
            {["GB","LS","RM","AN"].map(v=><div key={v} className="phone-story"><span>{v}</span></div>)}
          </div>
          <div className="phone-live">
            <div className="phone-live-overlay">
              <div className="phone-host"><div className="avatar sm">L</div><div><strong>Lara</strong><span>@lara</span></div></div>
              <span className="pill">1,2 mil</span>
            </div>
            <div className="phone-comments">
              <span><b>@rafa:</b> essa live tá muito boa 🔥</span>
              <span><b>@bia:</b> manda salve!</span>
              <span><b>@gui:</b> ◆ enviou um gift</span>
            </div>
          </div>
          <div className="phone-bottom">
            <span>Escreva um comentário…</span>
            <b>◇</b><b>♡</b>
          </div>
        </div>
      </div>
    </section>

    <section className="landing-strip">
      <span>Feed</span><span>Perfis</span><span>Reels</span><span>Lives</span><span>Salas</span><span>Chat</span><span>VIP</span>
    </section>

    <section className="landing-section" id="recursos">
      <div className="landing-section-head">
        <span className="eyebrow">TUDO NO MESMO APP</span>
        <h2>Uma rede social feita para ser usada de verdade.</h2>
        <p>Do primeiro post à primeira live, cada área faz parte da mesma experiência e usa a mesma identidade.</p>
      </div>
      <div className="landing-feature-grid">
        {features.map(f=><article className="landing-feature" key={f.title}><div className="landing-feature-icon">{f.icon}</div><h3>{f.title}</h3><p>{f.text}</p></article>)}
      </div>
    </section>

    <section className="landing-showcase" id="live">
      <div className="landing-showcase-copy">
        <span className="eyebrow">SEVEN LIVE</span>
        <h2>Live não é só vídeo. É interação.</h2>
        <p>Hosts podem conversar com a comunidade, receber convidados, controlar moderação, acompanhar gifts e iniciar batalhas. Quem assiste participa com comentários, gifts e interação ao vivo.</p>
        <div className="landing-list">
          <span>✓ Até 4 convidados por live</span>
          <span>✓ Comentários e moderação</span>
          <span>✓ Gifts e gemas</span>
          <span>✓ Batalhas / PK</span>
        </div>
        <Link className="button" href="/register">Criar minha conta</Link>
      </div>
      <div className="landing-live-card">
        <span className="landing-demo-label live-demo-label">EXEMPLO DE INTERFACE</span>
        <div className="live-preview-top"><div className="userrow"><div className="avatar">S</div><div><strong>Seven Creator</strong><span className="muted">@sevencreator</span></div></div><span className="live-chip">12,8K</span></div>
        <div className="live-preview-stage">
          <div className="battle-score"><b>12.450</b><span>PK</span><b>11.980</b></div>
          <div className="live-preview-comments"><span>@ana entrou na live</span><span>@leo: muito bom 🔥</span><span>@bia enviou ◆ x5</span></div>
        </div>
        <div className="live-preview-actions"><span>♡</span><span>◇</span><span>⋯</span></div>
      </div>
    </section>

    <section className="landing-section" id="seguranca">
      <div className="landing-security">
        <div><span className="eyebrow">SEGURANÇA & CONTROLE</span><h2>Você controla sua experiência.</h2><p>Conta verificada, sessões por dispositivo, bloqueios, denúncias, privacidade de perfil, moderação e exportação de dados fazem parte da base do Seven Chat.</p></div>
        <div className="security-grid">
          <div><strong>Sessões</strong><span>Veja e revogue dispositivos conectados.</span></div>
          <div><strong>Privacidade</strong><span>Perfis e espaços com controles próprios.</span></div>
          <div><strong>Moderação</strong><span>Bloqueios, denúncias e ações em lives.</span></div>
          <div><strong>Seus dados</strong><span>Exportação e exclusão pela conta.</span></div>
        </div>
      </div>
    </section>

    <section className="landing-final">
      <div><span className="eyebrow">PRONTO PARA ENTRAR?</span><h2>Seu espaço no Seven Chat começa agora.</h2><p>Crie seu perfil, encontre pessoas e participe da comunidade.</p></div>
      <div className="landing-cta"><Link className="button" href="/register">Criar conta grátis</Link><Link className="button secondary" href="/login">Entrar</Link></div>
    </section>

    <footer className="landing-footer">
      <span>© 2026 Seven Chat</span>
      <div><Link href="/privacy">Privacidade</Link><Link href="/terms">Termos</Link></div>
    </footer>
  </main>;
}

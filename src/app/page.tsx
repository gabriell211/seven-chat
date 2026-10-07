import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isRtcConfigured } from "@/lib/rtc";
import { isStorageConfigured } from "@/lib/storage";

function BrandMark(){
  return <span className="brand-mark" aria-hidden="true"><span/><span/><span/></span>;
}

export default async function LandingPage(){
  const session=await getSession();
  if(session)redirect("/feed");

  const rtcReady=isRtcConfigured();
  const storageReady=isStorageConfigured();
  const features=[
    {icon:"✦",title:"Feed social",text:"Publique, descubra pessoas e acompanhe a comunidade com ações persistidas no banco.",status:"Ativo",ready:true},
    {icon:"▶",title:"Reels",text:storageReady?"Vídeos curtos servidos pelo storage privado com visualizações únicas reais.":"Interface pronta; publicação de mídia aguarda credenciais do storage.",status:storageReady?"Ativo":"Storage pendente",ready:storageReady},
    {icon:"◉",title:"Lives",text:rtcReady?"Vídeo ao vivo com convidados, comments, gifts e batalha/PK usando RTC real.":"Fluxos e backend prontos; vídeo fica bloqueado até o LiveKit ser configurado.",status:rtcReady?"Ativo":"RTC pendente",ready:rtcReady},
    {icon:"⌁",title:"Salas de voz",text:rtcReady?"Salas públicas, privadas e VIP conectadas ao RTC real.":"Criação bloqueada enquanto o servidor RTC não estiver configurado.",status:rtcReady?"Ativo":"RTC pendente",ready:rtcReady},
    {icon:"✉",title:"Chat",text:"Mensagens persistidas, conversas diretas/grupos e atualização automática sem fingir websocket.",status:"Ativo",ready:true},
    {icon:"◆",title:"VIP & gifts",text:"Planos, carteira, gifts e checkout conectados ao banco e à InfinitePay.",status:"Ativo",ready:true}
  ];

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
        <span className="eyebrow">REDE SOCIAL EM CONSTRUÇÃO REAL</span>
        <h1>Converse. Descubra. Publique. Faça parte.</h1>
        <p>Seven Chat reúne feed, perfis, stories, reels, chat, lives, salas, gifts e VIP em uma única experiência. Recursos dependentes de infraestrutura ficam claramente sinalizados até estarem realmente disponíveis.</p>
        <div className="landing-cta">
          <Link className="button" href="/register">Começar agora</Link>
          <Link className="button secondary" href="/login">Já tenho conta</Link>
        </div>
        <div className="landing-trust">
          <span>● Feed e perfis ativos</span>
          <span>● Chat persistente ativo</span>
          <span>● {rtcReady?"RTC ativo":"RTC aguardando configuração"}</span>
        </div>
      </div>

      <div className="landing-phone-wrap" aria-label="Prévia ilustrativa do Seven Chat">
        <span className="landing-demo-label">DEMONSTRAÇÃO VISUAL</span>
        <div className="landing-glow"/>
        <div className="landing-phone">
          <div className="phone-top"><span>Seven Chat</span><span className="live-chip">DEMO</span></div>
          <div className="phone-story-row">
            {["GB","LS","RM","AN"].map(v=><div key={v} className="phone-story"><span>{v}</span></div>)}
          </div>
          <div className="phone-live">
            <div className="phone-live-overlay">
              <div className="phone-host"><div className="avatar sm">L</div><div><strong>Lara</strong><span>@lara</span></div></div>
              <span className="pill">exemplo</span>
            </div>
            <div className="phone-comments">
              <span><b>@rafa:</b> essa live tá muito boa 🔥</span>
              <span><b>@bia:</b> manda salve!</span>
              <span><b>@gui:</b> ◆ enviou um gift</span>
            </div>
          </div>
          <div className="phone-bottom"><span>Escreva um comentário…</span><b>◇</b><b>↗</b></div>
        </div>
      </div>
    </section>

    <section className="landing-strip">
      <span>Feed</span><span>Perfis</span><span>Stories</span><span>Reels</span><span>Lives</span><span>Salas</span><span>Chat</span><span>VIP</span>
    </section>

    <section className="landing-section" id="recursos">
      <div className="landing-section-head">
        <span className="eyebrow">STATUS REAL DO PRODUTO</span>
        <h2>O que funciona aparece como ativo. O que depende de infra não é fingido.</h2>
        <p>Cada área usa o mesmo design system e mostra o estado verdadeiro do backend e dos serviços externos.</p>
      </div>
      <div className="landing-feature-grid">
        {features.map(feature=><article className="landing-feature" key={feature.title}>
          <div className="row between">
            <div className="landing-feature-icon">{feature.icon}</div>
            <span className={"feature-status "+(feature.ready?"is-ready":"is-pending")}>{feature.status}</span>
          </div>
          <h3>{feature.title}</h3>
          <p>{feature.text}</p>
        </article>)}
      </div>
    </section>

    <section className="landing-showcase" id="live">
      <div className="landing-showcase-copy">
        <span className="eyebrow">SEVEN LIVE</span>
        <h2>{rtcReady?"Live real, com interação real.":"Live pronta para RTC — sem vídeo fake."}</h2>
        <p>{rtcReady
          ?"Hosts podem transmitir, receber convidados, moderar comentários, receber gifts e iniciar batalhas com placar persistido."
          :"Comentários, gifts, convites, moderação e PK já existem no backend; câmera e áudio ficam bloqueados até o LiveKit estar configurado no Vercel."}</p>
        <div className="landing-list">
          <span>✓ Convites de convidados</span>
          <span>✓ Comentários persistidos</span>
          <span>✓ Gifts e carteira</span>
          <span>✓ Batalha / PK com placar</span>
        </div>
        <Link className="button" href={rtcReady?"/register":"/lives"}>{rtcReady?"Criar minha conta":"Ver status da Live"}</Link>
      </div>
      <div className="landing-live-card">
        <span className="landing-demo-label live-demo-label">EXEMPLO DE INTERFACE</span>
        <div className="live-preview-top"><div className="userrow"><div className="avatar">S</div><div><strong>Seven Creator</strong><span className="muted">@sevencreator</span></div></div><span className="live-chip">DEMO</span></div>
        <div className="live-preview-stage">
          <div className="battle-score"><b>12.450</b><span>PK</span><b>11.980</b></div>
          <div className="live-preview-comments"><span>@ana entrou na live</span><span>@leo: muito bom 🔥</span><span>@bia enviou ◆ x5</span></div>
        </div>
        <div className="live-preview-actions"><span>◇</span><span>＋</span><span>↗</span></div>
      </div>
    </section>

    <section className="landing-section" id="seguranca">
      <div className="landing-security">
        <div><span className="eyebrow">SEGURANÇA & CONTROLE</span><h2>Você controla sua experiência.</h2><p>Conta verificada, sessões por dispositivo, bloqueios, denúncias, privacidade de perfil, moderação, rate limit e exportação de dados fazem parte da base.</p></div>
        <div className="security-grid">
          <div><strong>Sessões</strong><span>Veja e revogue dispositivos conectados.</span></div>
          <div><strong>Privacidade</strong><span>Perfil público ou privado e controles por contexto.</span></div>
          <div><strong>Moderação</strong><span>Bloqueios, denúncias e ações dentro de lives.</span></div>
          <div><strong>Proteção</strong><span>Rate limit com Redis ou fallback atômico no PostgreSQL.</span></div>
        </div>
      </div>
    </section>

    <section className="landing-final">
      <div><span className="eyebrow">ENTRE NO SEVEN</span><h2>Crie seu perfil e use o que já está ativo.</h2><p>Recursos dependentes de RTC/storage serão liberados somente quando a infraestrutura estiver realmente pronta.</p></div>
      <div className="landing-cta"><Link className="button" href="/register">Criar conta</Link><Link className="button secondary" href="/login">Entrar</Link></div>
    </section>

    <footer className="landing-footer">
      <span>© 2026 Seven Chat</span>
      <div><Link href="/privacy">Privacidade</Link><Link href="/terms">Termos</Link></div>
    </footer>
  </main>;
}

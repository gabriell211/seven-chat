# Seven Chat

> Uma rede social social-first e realtime com feed, chat, salas de voz, chamadas de voz/vídeo, lives, economia de Diamantes, presentes virtuais e benefícios VIP.

[![Status](https://img.shields.io/badge/status-planejamento-7c3aed)](#status-do-projeto)
[![Platform](https://img.shields.io/badge/platform-Web%20%7C%20Android%20%7C%20iOS-111827)](#plataformas)
[![License](https://img.shields.io/badge/license-Proprietary-black)](#licença)

## Visão do produto

**Seven Chat** é uma plataforma social pensada para descoberta de pessoas, criação de comunidades e interação em tempo real.

A proposta combina quatro experiências principais em um único produto:

1. **Rede social** — perfis, feed, posts, reels, seguidores, comentários e descoberta.
2. **Comunicação privada** — chat, mídia, mensagens de voz e chamadas.
3. **Comunidades ao vivo** — salas de voz, lives, convidados e batalhas.
4. **Economia social** — Diamantes, presentes virtuais, VIP, recompensas e monetização.

O objetivo não é clonar uma plataforma existente. O Seven Chat usa padrões já validados no mercado e cria uma experiência própria, com identidade visual, regras, economia e arquitetura independentes.

---

## Status do projeto

> **Estado atual do repositório: planejamento / bootstrap.**

Este README funciona como **especificação de produto e arquitetura**. Recursos marcados como planejados ainda não devem ser tratados como implementados.

### Legenda

- ✅ Implementado
- 🟡 Em desenvolvimento
- ⬜ Planejado
- 🔒 Requer revisão de segurança/compliance antes de produção

---

## Plataformas

| Plataforma | Estratégia |
|---|---|
| Web | Next.js + React + TypeScript |
| Android | React Native / Expo |
| iOS | React Native / Expo |
| API | Serviços stateless + domínio central |
| Realtime | Gateway persistente separado da camada serverless |
| Voz/Vídeo | WebRTC via serviço RTC dedicado |

---

## Experiência principal

### Feed social

⬜ Feed “Para você” e “Seguindo”  
⬜ Posts com texto, imagem e vídeo  
⬜ Reels / vídeos curtos verticais  
⬜ Curtidas e reações  
⬜ Comentários e respostas  
⬜ Compartilhamentos  
⬜ Favoritos / itens salvos  
⬜ Hashtags e tópicos  
⬜ Menções  
⬜ Contagem de visualizações  
⬜ Recomendações por interesses  
⬜ Ocultar conteúdo ou usuário  
⬜ Denunciar publicação, comentário ou perfil

### Perfis

⬜ @username único  
⬜ Nome de exibição  
⬜ Biografia  
⬜ Foto de perfil  
⬜ Banner  
⬜ País/região e idiomas opcionais  
⬜ Interesses  
⬜ Seguidores e seguindo  
⬜ Posts, reels e presentes recebidos  
⬜ Badges de conta, VIP e conquistas  
⬜ Molduras de avatar  
⬜ Molduras animadas  
⬜ GIF como avatar para planos elegíveis  
⬜ Tema de perfil  
⬜ Privacidade granular  
⬜ Bloqueio de usuário

### Descoberta de pessoas

⬜ Descoberta por interesses  
⬜ Filtro por gênero, quando permitido e configurado  
⬜ Faixa etária  
⬜ Região/idioma  
⬜ Usuários online  
⬜ Perfis em live  
⬜ Perfis em salas públicas  
⬜ Sugestões de amizade  
⬜ Match social opcional  
⬜ Controles para reduzir repetição e spam de perfis

> Filtros e recomendações devem respeitar idade, privacidade, bloqueios, localização aproximada e regras de segurança da comunidade.

---

## Chat privado

⬜ Conversas 1:1  
⬜ Grupos  
⬜ Grupos privados para VIP  
⬜ Texto e emojis  
⬜ Stickers  
⬜ GIFs  
⬜ Fotos  
⬜ Foto de visualização única  
⬜ Vídeos para usuários elegíveis/VIP  
⬜ Áudios  
⬜ Responder mensagem  
⬜ Encaminhar  
⬜ Editar e apagar  
⬜ Reações  
⬜ Fixar mensagem  
⬜ Indicador “digitando...”  
⬜ Entregue / visualizado  
⬜ Presença online configurável  
⬜ Busca por mensagens  
⬜ Silenciar conversa  
⬜ Bloquear / denunciar  
⬜ Limites anti-spam

### Mídia de visualização única

Mídia efêmera deverá:

- expirar após a primeira abertura;
- usar URLs assinadas de curta duração;
- impedir reabertura pelo cliente;
- remover acesso ao objeto após expiração;
- não ser armazenada em caches públicos;
- registrar auditoria mínima de abertura;
- informar claramente que **nenhum aplicativo consegue impedir 100% capturas externas, gravação de tela ou uso de outro dispositivo**.

---

## Chamadas de voz e vídeo

⬜ Chamada de voz 1:1  
⬜ Chamada de vídeo 1:1  
⬜ Aceitar / recusar  
⬜ Mudo  
⬜ Alternar câmera  
⬜ Selecionar dispositivo  
⬜ Viva-voz  
⬜ Reconexão automática  
⬜ Indicador de qualidade de rede  
⬜ Histórico de chamadas  
⬜ Bloqueio de chamadas de desconhecidos  
⬜ Fundo de vídeo para planos elegíveis  
⬜ Chamadas em grupo como evolução futura

### Arquitetura de mídia

Chamadas não devem transportar áudio/vídeo pelo servidor web principal.

Fluxo recomendado:

```text
Cliente A
   │
   ├── sinalização ──> Realtime/RTC Gateway
   │
   └──── WebRTC ─────> SFU/TURN/STUN <──── WebRTC ──── Cliente B
```

Tecnologias candidatas:

- LiveKit;
- mediasoup;
- coturn;
- WebRTC nativo.

---

## Salas de voz

⬜ Salas públicas  
⬜ Salas privadas  
⬜ Até **10 participantes no palco** inicialmente  
⬜ Ouvintes adicionais fora do palco  
⬜ Host e co-hosts  
⬜ Levantar a mão  
⬜ Mover participante para palco  
⬜ Silenciar / remover participante  
⬜ Convites  
⬜ Presentes em tempo real  
⬜ Reações  
⬜ Tema/título da sala  
⬜ Sala bloqueada por senha  
⬜ Sala somente para convidados  
⬜ Sala exclusiva para VIP  
⬜ Moderação e denúncia durante a sessão

---

## Lives

⬜ Live de vídeo  
⬜ Live somente áudio  
⬜ Chat em tempo real  
⬜ Seguidores recebem notificação  
⬜ Curtidas/reação instantânea  
⬜ Presentes virtuais  
⬜ Ranking da live  
⬜ Metas de presentes  
⬜ Moderadores da live  
⬜ Fixar comentário  
⬜ Mutar usuário no chat  
⬜ Banir usuário da live  
⬜ Até **4 convidados/co-hosts**  
⬜ Batalha entre lives  
⬜ Placar de presentes durante a batalha  
⬜ Eventos e missões temporárias  
⬜ Replay opcional

### Regra de comentários em live

Comentários de live serão leves e seguros:

- texto;
- emojis;
- stickers aprovados;
- sem envio direto de foto ou vídeo nos comentários.

---

## Economia de Diamantes

**Diamantes** são a moeda virtual de consumo do Seven Chat.

### O usuário poderá usar Diamantes para

⬜ Comprar e enviar presentes  
⬜ Comprar itens cosméticos  
⬜ Desbloquear eventos especiais  
⬜ Comprar efeitos de entrada  
⬜ Participar de mecânicas premium  
⬜ Comprar o status **Mega Fã**  
⬜ Presentear VIP para outra pessoa  
⬜ Acessar itens especiais sazonais

### Regras fundamentais

- Diamantes comprados não representam saldo bancário.
- Saldo nunca deve ser alterado diretamente pelo frontend.
- Toda movimentação passa por um **ledger imutável**.
- Operações financeiras usam **idempotency keys**.
- Webhooks de pagamento precisam de validação de assinatura.
- Reembolsos, chargebacks e fraudes devem gerar lançamentos compensatórios, nunca edição destrutiva do histórico.
- O catálogo e os preços precisam ser versionados.
- Limites e políticas diferentes podem existir por país, idade e loja.

### Modelo de ledger

```text
Wallet
 ├── available_balance
 └── locked_balance

LedgerEntry
 ├── id
 ├── wallet_id
 ├── type
 ├── amount
 ├── direction
 ├── source_type
 ├── source_id
 ├── idempotency_key
 ├── balance_after
 └── created_at
```

Tipos de lançamento:

- purchase;
- gift_sent;
- gift_received;
- reward;
- vip_purchase;
- vip_gift;
- refund;
- chargeback;
- moderation_adjustment;
- promotional_credit.

---

## Presentes virtuais

A meta do catálogo é suportar aproximadamente **300 presentes**, divididos por categoria.

Categorias sugeridas:

- Básicos;
- Românticos;
- Festa;
- Luxo;
- Veículos;
- Animais;
- Fantasia;
- Esportes;
- Datas comemorativas;
- Eventos;
- VIP;
- Mega Fã;
- 3D / cinematográficos.

⬜ Presente simples  
⬜ Presente animado  
⬜ Presente em tela cheia  
⬜ Presente 3D quando suportado  
⬜ Combos  
⬜ Sequência/combo de envio  
⬜ Presentes sazonais  
⬜ Presentes exclusivos por nível  
⬜ Ranking de maiores apoiadores  
⬜ Histórico de presentes enviados/recebidos

> Animações pesadas devem ser entregues como assets versionados e carregadas sob demanda, sem bloquear a UI.

---

## VIP

O Seven Chat terá assinatura premium com benefícios visuais e funcionais.

### Estrutura inicial

Os nomes são provisórios e podem ser ajustados:

| Benefício | VIP | VIP+ | Elite |
|---|:---:|:---:|:---:|
| Badge exclusivo | ✅ | ✅ | ✅ |
| Remover anúncios tradicionais | ✅ | ✅ | ✅ |
| Avatar GIF | ✅ | ✅ | ✅ |
| Molduras animadas | ✅ | ✅ | ✅ |
| Temas de perfil | ✅ | ✅ | ✅ |
| Uploads maiores | ✅ | ✅ | ✅ |
| Vídeo no chat | ✅ | ✅ | ✅ |
| Grupos privados | — | ✅ | ✅ |
| Background de chamada | — | ✅ | ✅ |
| Efeitos de entrada | — | ✅ | ✅ |
| Molduras premium adicionais | — | ✅ | ✅ |
| Benefícios sazonais | — | ✅ | ✅ |
| Prioridade em suporte | — | — | ✅ |

### Presentear VIP

⬜ Usuário poderá comprar **1 mês de VIP** para outra conta  
⬜ Confirmação explícita antes da compra  
⬜ Prevenção contra auto-presente abusivo  
⬜ Auditoria completa da transação  
⬜ Não permitir conversão inversa para Diamantes

---

## Mega Fã

**Mega Fã** será um status separado do VIP.

Regras previstas:

- comprado exclusivamente com Diamantes;
- vinculado a um criador/perfil por período definido;
- badge próprio;
- destaque em comentários e lives;
- moldura especial;
- ranking de apoio;
- benefícios não financeiros configuráveis.

VIP não concede Mega Fã automaticamente.

---

## Recompensas por anúncios

⬜ Anúncios recompensados opcionais  
⬜ Usuário assiste voluntariamente  
⬜ Recompensa pequena em Diamantes promocionais  
⬜ Limite diário  
⬜ Cooldown  
⬜ Detecção de abuso  
⬜ Validação server-side do callback da rede de anúncios  
⬜ Ledger separado para créditos promocionais

Diamantes promocionais podem ter regras distintas dos Diamantes comprados para evitar exploração da economia.

---

## Batalhas e eventos

⬜ Live vs Live  
⬜ Times  
⬜ Cronômetro  
⬜ Placar em tempo real  
⬜ Multiplicadores temporários  
⬜ Presentes elegíveis por evento  
⬜ Missões diárias/semanais  
⬜ Ranking por temporada  
⬜ Recompensas cosméticas  
⬜ Eventos de gifts com milestones

---

## Notificações

⬜ Nova mensagem  
⬜ Ligação perdida  
⬜ Novo seguidor  
⬜ Curtida/comentário  
⬜ Convite para sala  
⬜ Convite para live  
⬜ Presente recebido  
⬜ VIP recebido  
⬜ Live iniciada  
⬜ Evento especial  
⬜ Aviso de segurança/moderação

Canais:

- in-app;
- push;
- e-mail apenas para eventos importantes;
- preferências individuais por categoria.

---

## Autenticação e conta

⬜ Login com Google  
⬜ Cadastro por e-mail  
⬜ Verificação de e-mail  
⬜ Bloqueio de provedores de e-mail descartável  
⬜ Username único  
⬜ Sessões por dispositivo  
⬜ Revogação remota de sessão  
⬜ Recuperação de conta  
⬜ 2FA opcional  
⬜ Passkeys/WebAuthn como evolução  
⬜ Controles anti-multi-account  
⬜ Telefone como sinal adicional de confiança quando houver verificação adequada

> Apenas coletar um número de telefone sem provar posse não é suficiente para garantir unicidade de pessoa. O sistema deve combinar sinais de conta, dispositivo, risco e verificação quando necessário.

---

## Segurança, proteção e privacidade

### Controles obrigatórios

⬜ Bloquear usuário  
⬜ Denunciar usuário  
⬜ Denunciar mensagem  
⬜ Denunciar live  
⬜ Denunciar publicação  
⬜ Motivos padronizados  
⬜ Evidência vinculada à denúncia  
⬜ Fila de moderação  
⬜ Suspensão temporária  
⬜ Banimento  
⬜ Shadow restrictions somente com política explícita  
⬜ Apelação  
⬜ Auditoria administrativa  
⬜ Rate limiting  
⬜ Anti-spam  
⬜ Anti-bruteforce  
⬜ Detecção de sessão suspeita  
⬜ Proteção de upload  
⬜ URLs assinadas  
⬜ Sanitização de conteúdo  
⬜ CSP no web  
⬜ Segredos somente no backend  
⬜ Logs sem tokens, senhas ou mídia privada

### Segurança em lives e chamadas

- consentimento antes de entrar em vídeo;
- bloquear chamadas de desconhecidos;
- botão de saída sempre acessível;
- denúncia durante a sessão;
- banimento imediato da sala/live;
- proteção especial para menores;
- política rígida contra conteúdo sexual envolvendo menores;
- retenção mínima necessária de metadados de segurança.

### Privacidade

O projeto deverá ser preparado para:

- LGPD;
- GDPR quando aplicável;
- exportação de dados;
- exclusão de conta;
- política de retenção;
- consentimento para recursos sensíveis;
- controles de visibilidade;
- minimização de dados;
- criptografia em trânsito e em repouso.

---

## Moderação e painel administrativo

⬜ Dashboard administrativo  
⬜ Usuários  
⬜ Conteúdo denunciado  
⬜ Lives ativas  
⬜ Salas ativas  
⬜ Histórico de punições  
⬜ Auditoria  
⬜ Catálogo de gifts  
⬜ Preços  
⬜ Pacotes de Diamantes  
⬜ Planos VIP  
⬜ Eventos  
⬜ Missões  
⬜ Cupons  
⬜ Recompensas  
⬜ Feature flags  
⬜ Configuração regional  
⬜ Métricas antifraude  
⬜ Reembolso administrativo com trilha de auditoria

Papéis:

- support;
- moderator;
- senior_moderator;
- finance;
- content_manager;
- admin;
- owner.

Permissões devem seguir RBAC e princípio do menor privilégio.

---

## Internacionalização

Objetivo inicial: interface preparada para até **12 idiomas**.

Sugestão de primeira leva:

- Português (Brasil) — padrão;
- English;
- Español;
- Français;
- Deutsch;
- Italiano;
- 日本語;
- 한국어;
- 中文;
- العربية;
- हिन्दी;
- Türkçe.

Datas, números, moedas e pluralização devem usar APIs de internacionalização, nunca strings fixas.

---

## Arquitetura recomendada

### Aplicações

```text
apps/
├── web/              # Next.js
├── mobile/           # Expo / React Native
├── admin/            # Painel administrativo
└── realtime/         # Gateway persistente de WebSocket/RTC

packages/
├── ui/               # Design system compartilhado
├── contracts/        # Schemas e contratos
├── domain/           # Regras de domínio compartilháveis
├── config/           # ESLint/TS/config
└── observability/    # Logs, tracing e métricas
```

### Stack sugerida

| Camada | Tecnologia |
|---|---|
| Web | Next.js App Router, React, TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Server State | TanStack Query |
| Mobile | Expo + React Native |
| Auth | Better Auth ou provedor equivalente |
| Banco | PostgreSQL / Neon |
| ORM | Prisma |
| Cache / rate limit | Redis / Upstash |
| Objetos | S3-compatible storage |
| Realtime | WebSocket gateway persistente |
| Voz/Vídeo | WebRTC + LiveKit/mediasoup |
| TURN | coturn |
| Jobs | fila durável |
| Observabilidade | Sentry + logs estruturados |
| Push | FCM / APNs |
| Web | Vercel |
| Realtime/RTC | infraestrutura persistente dedicada |

### Por que separar realtime da Vercel?

A aplicação web e APIs stateless funcionam muito bem em infraestrutura serverless. Já WebSocket persistente, presença, SFU e sinalização de mídia precisam de processos duradouros e escaláveis horizontalmente.

Portanto:

```text
Vercel
 ├── Web
 ├── BFF/API stateless
 └── Webhooks

Infra persistente
 ├── WebSocket gateway
 ├── RTC/SFU
 ├── TURN
 └── workers de longa duração
```

---

## Domínios principais

Entidades centrais previstas:

```text
User
Profile
Session
Device
Follow
Block
Post
Reel
Comment
Reaction
Conversation
ConversationMember
Message
MessageMedia
Room
RoomMember
LiveSession
LiveGuest
LiveModerator
Call
Wallet
LedgerEntry
DiamondPackage
Gift
GiftAsset
GiftTransaction
VipPlan
VipSubscription
VipGift
FanStatus
RewardedAd
Notification
Report
ModerationAction
AuditLog
Payment
Refund
FeatureFlag
```

### Regras de domínio importantes

- saldo deriva de lançamentos, não do cliente;
- transações financeiras são idempotentes;
- mensagem pertence a uma conversa válida;
- usuário bloqueado não inicia contato;
- banimento encerra sessões ativas;
- gift só pode usar preço/versionamento válidos no momento da compra;
- assinatura precisa de período e origem;
- permissões de moderador não são herdadas pelo frontend;
- mídia privada nunca usa bucket público.

---

## API

Convenção sugerida:

```text
/api/v1/auth/*
/api/v1/users/*
/api/v1/profiles/*
/api/v1/feed/*
/api/v1/posts/*
/api/v1/reels/*
/api/v1/chat/*
/api/v1/rooms/*
/api/v1/lives/*
/api/v1/calls/*
/api/v1/wallet/*
/api/v1/gifts/*
/api/v1/vip/*
/api/v1/payments/*
/api/v1/reports/*
/api/v1/notifications/*
/api/v1/admin/*
```

### Regras de API

- contratos tipados;
- validação estrita de entrada;
- cursor pagination para feeds;
- autorização por recurso;
- rate limit por rota;
- idempotência em operações financeiras;
- webhooks assinados;
- erros com códigos estáveis;
- nunca retornar campos internos por padrão.

---

## Performance

### Feed

- paginação por cursor;
- índices compostos;
- fan-out somente quando fizer sentido;
- cache de páginas quentes;
- mídia em CDN;
- thumbnails e múltiplas resoluções.

### Chat

- ordenação por `conversation_id + created_at`;
- paginação para trás;
- presença fora do banco relacional;
- anexos fora do banco;
- confirmação assíncrona de processamento de mídia.

### Lives

- mídia fora do servidor HTTP;
- métricas agregadas;
- eventos de gifts enviados pelo realtime gateway;
- persistência eventual de contadores não financeiros;
- ledger síncrono/transacional para operações de valor.

---

## Banco e índices

Índices mínimos previstos:

```text
users(email)
users(username)
follows(follower_id, following_id)
posts(author_id, created_at DESC)
comments(post_id, created_at)
conversation_members(user_id, conversation_id)
messages(conversation_id, created_at DESC)
live_sessions(status, started_at DESC)
ledger_entries(wallet_id, created_at DESC)
ledger_entries(idempotency_key UNIQUE)
gift_transactions(sender_id, created_at DESC)
reports(status, created_at)
notifications(user_id, read_at, created_at DESC)
```

Toda query crítica deverá ser validada com `EXPLAIN ANALYZE` em volume representativo antes de produção.

---

## Upload e processamento de mídia

Fluxo:

```text
Cliente
  │
  ├── pede upload URL
  ▼
API autoriza
  │
  ▼
Storage privado
  │
  ├── scan
  ├── metadata
  ├── thumbnail
  ├── transcode
  └── moderação
  │
  ▼
CDN / URL assinada
```

Requisitos:

- limite de tamanho;
- MIME validado pelo conteúdo;
- nomes aleatórios;
- antivírus/scan quando aplicável;
- transcode de vídeo;
- thumbnails;
- remoção de metadados desnecessários;
- URLs temporárias para mídia privada.

---

## Pagamentos

A implementação deverá suportar abstração de provedor.

Possíveis origens:

- Google Play Billing;
- Apple In-App Purchase;
- checkout web permitido pela política aplicável;
- gateways regionais.

### Regras

- validar compra no backend;
- nunca confiar em preço enviado pelo cliente;
- conciliar pedidos;
- armazenar IDs externos;
- webhook idempotente;
- tratar pendente, pago, cancelado, reembolsado e chargeback;
- manter histórico contábil.

---

## Observabilidade

⬜ Error tracking  
⬜ Logs estruturados  
⬜ Correlation ID  
⬜ Métricas de latência  
⬜ Métricas de realtime  
⬜ Métricas de RTC  
⬜ Falhas de pagamento  
⬜ Taxa de entrega de mensagens  
⬜ Crash-free sessions  
⬜ Alertas de fraude  
⬜ Health checks

Nenhum log deve conter:

- senha;
- token;
- cookie de sessão;
- conteúdo privado desnecessário;
- dados completos de pagamento.

---

## Testes

### Unitários

- regras de VIP;
- ledger;
- preços de gifts;
- bloqueios;
- permissões;
- expiração de mídia;
- elegibilidade de recursos.

### Integração

- auth;
- chat;
- gifts;
- compras;
- webhooks;
- assinaturas;
- denúncias;
- chamadas de domínio.

### E2E

- cadastro → perfil → seguir → chat;
- compra → Diamantes → gift;
- assinar VIP;
- presentear VIP;
- criar sala → convidar → moderar;
- iniciar live → convidar co-host → receber gift;
- bloquear usuário;
- denúncia e ação do moderador.

### Carga

- conexões simultâneas;
- mensagens/segundo;
- gifts/segundo;
- viewers por live;
- fan-out de notificações;
- picos de login.

---

## CI/CD

Pipeline recomendado:

```text
install
  ↓
lint
  ↓
typecheck
  ↓
unit tests
  ↓
integration tests
  ↓
build
  ↓
security checks
  ↓
preview
  ↓
production
```

Releases de produção devem exigir migrações seguras e plano de rollback.

---

## Roadmap

### Fase 0 — Fundação

⬜ Monorepo  
⬜ Design system  
⬜ Banco  
⬜ Auth  
⬜ Observabilidade  
⬜ Storage  
⬜ CI/CD  
⬜ Políticas de segurança

### Fase 1 — Social

⬜ Perfil  
⬜ Follow  
⬜ Feed  
⬜ Posts  
⬜ Comentários  
⬜ Reels  
⬜ Busca

### Fase 2 — Chat

⬜ Conversas  
⬜ Mídia  
⬜ Visualização única  
⬜ Áudio  
⬜ Presença  
⬜ Push

### Fase 3 — Voz e vídeo

⬜ WebRTC  
⬜ Chamadas  
⬜ Salas  
⬜ TURN  
⬜ Qualidade adaptativa

### Fase 4 — Economia

⬜ Wallet  
⬜ Ledger  
⬜ Diamantes  
⬜ Gifts  
⬜ VIP  
⬜ Presentear VIP  
⬜ Mega Fã  
⬜ Ads recompensados

### Fase 5 — Lives

⬜ Live  
⬜ Co-hosts  
⬜ Chat  
⬜ Gifts realtime  
⬜ Batalhas  
⬜ Eventos

### Fase 6 — Segurança e escala

⬜ Admin  
⬜ Moderação  
⬜ Antifraude  
⬜ Load tests  
⬜ Compliance  
⬜ Hardening  
⬜ Disaster recovery

---

## Métricas de produto

Métricas úteis sem depender de métricas de vaidade:

- DAU / MAU;
- retenção D1, D7 e D30;
- sessões por usuário;
- mensagens entregues;
- salas criadas;
- tempo saudável em live;
- criadores ativos;
- conversão para VIP;
- compradores de Diamantes;
- taxa de gift por live;
- chargeback rate;
- report rate;
- tempo de resposta da moderação;
- bloqueios por 1.000 sessões;
- crash-free sessions.

---

## Princípios de UX

1. Chat e conteúdo nunca devem travar por causa de animações de gifts.
2. Comprar Diamantes exige preço, quantidade e confirmação claros.
3. VIP não deve esconder funções essenciais de segurança.
4. Sair de chamada/live deve ser possível em um toque.
5. Bloquear e denunciar devem estar disponíveis perto do conteúdo.
6. Usuário deve saber quando mídia é efêmera.
7. O app deve funcionar bem em redes móveis instáveis.
8. Recursos premium devem melhorar experiência, não remover proteções básicas.
9. Acessibilidade deve fazer parte do design system.
10. A interface deve manter identidade própria do Seven Chat.

---

## Direção visual

Identidade prevista:

- roxo como cor principal;
- superfícies escuras e claras;
- cards com profundidade moderada;
- animações rápidas;
- microinterações;
- gifts com forte destaque visual;
- UI mobile-first;
- navegação desktop com sidebar;
- acessibilidade de contraste e foco;
- animações reduzidas quando `prefers-reduced-motion` estiver ativo.

Áreas principais:

```text
Início
Explorar
Reels
Lives
Salas
Chat
Notificações
Carteira
VIP
Perfil
Configurações
```

---

## Referências de produto

O Seven Chat observa padrões de UX e monetização já consolidados, sem copiar código, marca ou identidade visual.

### Litmatch

Referências úteis:

- social discovery;
- conversas rápidas;
- voice game;
- party chat;
- personalização de avatar.

### BIGO LIVE

Referências úteis:

- lives;
- áudio ao vivo;
- multi-guest;
- batalhas;
- gifts;
- economia com Diamantes.

### Tango

Referências úteis:

- presentes;
- assinaturas de criadores;
- fan levels;
- eventos de gifts;
- benefícios de fidelidade.

### Azar

Referências úteis:

- descoberta por vídeo;
- filtros;
- premium;
- controles de quem o usuário deseja conhecer.

### Discord

Referências úteis:

- benefícios premium;
- perfil personalizado;
- avatar animado;
- temas;
- backgrounds;
- streaming com maior qualidade.

> As referências são apenas estudo de produto. Seven Chat deve manter implementação, nomenclatura, regras, design e assets próprios.

---

## Regras de contribuição

Enquanto o produto estiver em fase inicial:

1. mudanças de arquitetura devem ser documentadas;
2. regras financeiras precisam de testes;
3. nenhuma feature crítica pode depender apenas de validação no frontend;
4. secrets nunca entram no Git;
5. migrations precisam ser reversíveis ou ter plano explícito de rollback;
6. novas permissões administrativas exigem revisão;
7. assets de terceiros precisam de licença compatível.

---

## Segurança de segredos

Nunca commitar:

```text
.env
.env.local
*.pem
*.key
service-account.json
credentials.json
cookies.txt
tokens.txt
```

Use `.env.example` somente com placeholders.

---

## Definição de pronto

Uma funcionalidade só é considerada pronta quando possui:

- regras de produto definidas;
- validação;
- autorização;
- tratamento de erro;
- estados de loading/empty/error;
- acessibilidade;
- logs necessários;
- testes;
- documentação;
- métricas relevantes;
- revisão de segurança quando aplicável;
- comportamento mobile e web validado.

---

## Licença

**Proprietary / All rights reserved**, salvo decisão futura em contrário.

O código, a marca, os assets e a identidade do Seven Chat não devem ser redistribuídos ou reutilizados sem autorização do proprietário do projeto.

---

## Autor

Desenvolvido por **gabriell211**.

Repositório: https://github.com/gabriell211/seven-chat

# Seven Chat

> Rede social social-first e realtime para pessoas de **13 a 99 anos**, com feed, stories, reels, chat, chamadas de voz/vídeo, salas de voz, lives, Diamantes, presentes virtuais, VIP, Mega Fã e monetização social.

[![Status](https://img.shields.io/badge/status-especifica%C3%A7%C3%A3o%201.0-7c3aed)](#status-do-projeto)
[![Age](https://img.shields.io/badge/idade-13--99-111827)](#idade)
[![Platform](https://img.shields.io/badge/platform-Web%20%7C%20Android%20%7C%20iOS-111827)](#plataformas)
[![License](https://img.shields.io/badge/license-Proprietary-black)](#licença)

---

## Sumário

- [Visão do produto](#visão-do-produto)
- [Status do projeto](#status-do-projeto)
- [Contrato de completude](#contrato-de-completude)
- [Idade](#idade)
- [Plataformas](#plataformas)
- [Autenticação e conta](#autenticação-e-conta)
- [Perfis e identidade](#perfis-e-identidade)
- [Rede social](#rede-social)
- [Descoberta e busca](#descoberta-e-busca)
- [Chat privado e grupos](#chat-privado-e-grupos)
- [Chamadas de voz e vídeo](#chamadas-de-voz-e-vídeo)
- [Salas de voz](#salas-de-voz)
- [Lives](#lives)
- [Diamantes e carteira](#diamantes-e-carteira)
- [Presentes virtuais](#presentes-virtuais)
- [VIP](#vip)
- [Mega Fã](#mega-fã)
- [Criadores e monetização](#criadores-e-monetização)
- [Anúncios recompensados](#anúncios-recompensados)
- [Notificações](#notificações)
- [Moderação e segurança](#moderação-e-segurança)
- [Painel administrativo](#painel-administrativo)
- [Privacidade e compliance](#privacidade-e-compliance)
- [Arquitetura](#arquitetura)
- [Domínios e entidades](#domínios-e-entidades)
- [Banco de dados](#banco-de-dados)
- [Realtime](#realtime)
- [Voz e vídeo / RTC](#voz-e-vídeo--rtc)
- [Mídia e storage](#mídia-e-storage)
- [API](#api)
- [Pagamentos](#pagamentos)
- [Filas e jobs](#filas-e-jobs)
- [Cache e rate limiting](#cache-e-rate-limiting)
- [Busca](#busca)
- [Observabilidade](#observabilidade)
- [Backup e recuperação](#backup-e-recuperação)
- [Performance e escala](#performance-e-escala)
- [Acessibilidade](#acessibilidade)
- [Internacionalização](#internacionalização)
- [Design e UX](#design-e-ux)
- [Testes](#testes)
- [CI/CD](#cicd)
- [Ambientes](#ambientes)
- [Roadmap](#roadmap)
- [Critérios de lançamento 1.0](#critérios-de-lançamento-10)
- [Referências de produto](#referências-de-produto)
- [Licença](#licença)

---

## Visão do produto

**Seven Chat** é uma plataforma social para descoberta de pessoas, comunidades e interação em tempo real.

O produto combina:

1. **Rede social** — perfis, seguidores, feed, posts, stories, reels, comentários e descoberta.
2. **Comunicação privada** — chat 1:1, grupos, mídia, áudio e mensagens efêmeras.
3. **Voz e vídeo** — chamadas privadas e comunicação em tempo real.
4. **Comunidades ao vivo** — salas de voz, lives, convidados e batalhas.
5. **Economia social** — Diamantes, presentes virtuais, VIP, Mega Fã, recompensas e itens cosméticos.
6. **Monetização de criadores** — programa opcional para criadores elegíveis, com regras financeiras e de compliance separadas.

O Seven Chat não deve copiar marca, código, design, assets ou identidade de plataformas existentes. Referências externas servem apenas para estudar padrões consolidados de UX e produto.

---

## Status do projeto

> **Estado atual: especificação / bootstrap.**

Este README é a **fonte principal de requisitos de produto e arquitetura** enquanto o projeto está sendo construído.

### Legenda

- ✅ Implementado, testado e validado
- 🟡 Em desenvolvimento
- ⬜ Planejado
- 🔒 Bloqueado até revisão de segurança, compliance ou política de loja

> Em tabelas de benefícios, “Sim” significa que o benefício pertence ao plano; não significa que já foi implementado.

---

## Contrato de completude

O Seven Chat só poderá ser chamado de **1.0 completo** quando:

- todos os recursos P0 e P1 estiverem implementados;
- nenhum requisito crítico estiver apenas simulado ou mockado;
- nenhum fluxo financeiro depender de cálculo do frontend;
- login, perfil, feed, chat, notificações, chamadas, salas, lives, gifts e pagamentos tiverem testes E2E;
- carteira e pagamentos passarem por reconciliação;
- bloqueio e denúncia funcionarem em todos os tipos de UGC;
- exclusão de conta e exportação de dados estiverem disponíveis;
- backups e restauração tiverem sido testados;
- observabilidade e alertas estiverem ativos;
- testes de carga tiverem sido executados;
- builds Web, Android e iOS estiverem publicáveis;
- políticas de App Store e Google Play aplicáveis estiverem atendidas;
- documentação operacional e runbooks estiverem disponíveis.

---

## Idade

O Seven Chat aceita cadastro de pessoas com **idade entre 13 e 99 anos**.

### Regras do produto

- idade mínima: **13 anos**;
- idade máxima: **99 anos**;
- idade exibida no perfil;
- data de nascimento não deve ser editável livremente após o cadastro;
- correção de data de nascimento exige fluxo específico de suporte/verificação;
- idade é recalculada a partir da data de nascimento;
- o frontend nunca deve aceitar idade digitada como fonte de verdade;
- usuários fora do intervalo 13–99 não concluem o cadastro.

O Seven Chat **não cria um catálogo diferente de funcionalidades por idade como regra geral de produto**.

Requisitos obrigatórios de loja, legislação ou região devem ser tratados como uma **camada de compliance**, sem alterar desnecessariamente a experiência global.

---

## Plataformas

| Plataforma | Estratégia |
|---|---|
| Web | Next.js + React + TypeScript |
| Android | React Native / Expo |
| iOS | React Native / Expo |
| API | Backend stateless com domínio central |
| Realtime | Gateway persistente separado da camada serverless |
| Voz/Vídeo | WebRTC via serviço RTC dedicado |
| Admin | Aplicação web separada com RBAC |

---

# Produto

## Autenticação e conta

⬜ Cadastro por e-mail  
⬜ Login por e-mail  
⬜ Login com Google  
⬜ Verificação de e-mail  
⬜ Bloqueio de provedores de e-mail descartável  
⬜ Username único  
⬜ Recuperação de senha  
⬜ Alteração de senha  
⬜ Alteração de e-mail com reverificação  
⬜ Sessões por dispositivo  
⬜ Revogação remota de sessão  
⬜ Logout de todos os dispositivos  
⬜ 2FA/TOTP  
⬜ Passkeys/WebAuthn como evolução  
⬜ Detecção de login suspeito  
⬜ Histórico de dispositivos  
⬜ Data de nascimento  
⬜ Validação da faixa 13–99  
⬜ Exclusão de conta  
⬜ Desativação temporária de conta  
⬜ Exportação de dados  
⬜ Bloqueio de conta administrativa  
⬜ Reativação quando aplicável  
⬜ Aceite versionado de Termos e Política de Privacidade

### Estados de conta

```text
pending_verification
active
restricted
suspended
banned
deactivated
deletion_pending
deleted
```

A autenticação não pode depender apenas de estado salvo no cliente.

---

## Perfis e identidade

⬜ @username único  
⬜ Nome de exibição  
⬜ Idade visível  
⬜ Biografia  
⬜ Foto de perfil  
⬜ Banner  
⬜ País/região opcional  
⬜ Idiomas  
⬜ Interesses  
⬜ Pronomes opcionais  
⬜ Seguidores  
⬜ Seguindo  
⬜ Número de curtidas recebidas  
⬜ Posts  
⬜ Reels  
⬜ Presentes recebidos  
⬜ Badges  
⬜ Badge VIP  
⬜ Badge Mega Fã quando aplicável  
⬜ Molduras de avatar  
⬜ Molduras animadas  
⬜ Avatar GIF para plano elegível  
⬜ Banner animado para plano elegível  
⬜ Tema do perfil  
⬜ Cor de destaque  
⬜ Links permitidos  
⬜ Status online configurável  
⬜ Última atividade configurável  
⬜ Perfil público/privado  
⬜ Aprovação de seguidores para perfil privado  
⬜ Bloqueio de usuário  
⬜ Denúncia de perfil  
⬜ Compartilhar perfil por link/QR

---

## Rede social

### Feed

⬜ Feed “Para você”  
⬜ Feed “Seguindo”  
⬜ Feed cronológico opcional  
⬜ Paginação por cursor  
⬜ Ranking/recomendação server-side  
⬜ Ocultar conteúdo já visto  
⬜ “Não tenho interesse”  
⬜ Bloquear autor  
⬜ Denunciar conteúdo

### Posts

⬜ Texto  
⬜ Imagem  
⬜ Carrossel  
⬜ Vídeo  
⬜ Localização opcional e aproximada  
⬜ Hashtags  
⬜ Menções  
⬜ Curtidas  
⬜ Reações  
⬜ Comentários  
⬜ Respostas a comentários  
⬜ Compartilhamentos  
⬜ Salvos  
⬜ Contagem de visualizações  
⬜ Editar legenda  
⬜ Excluir publicação  
⬜ Arquivar  
⬜ Fixar no perfil  
⬜ Privacidade por post  
⬜ Desativar comentários  
⬜ Filtrar comentários  
⬜ Denunciar

### Stories

⬜ Foto  
⬜ Vídeo  
⬜ Texto  
⬜ Música quando houver licença adequada  
⬜ Stickers  
⬜ Menções  
⬜ Respostas privadas  
⬜ Visualizadores  
⬜ Reações  
⬜ Expiração configurada em 24 horas  
⬜ Destaques no perfil  
⬜ Silenciar story de usuário

### Reels

⬜ Feed vertical  
⬜ Autoplay  
⬜ Curtidas  
⬜ Comentários  
⬜ Compartilhamento  
⬜ Salvar  
⬜ Seguir criador  
⬜ Denunciar  
⬜ Legenda  
⬜ Hashtags  
⬜ Áudio original  
⬜ Transcode adaptativo  
⬜ Thumbnail  
⬜ Contagem de visualizações  
⬜ Preload controlado  
⬜ Algoritmo de recomendação

---

## Descoberta e busca

⬜ Busca por usuário  
⬜ Busca por @username  
⬜ Busca por post  
⬜ Busca por hashtag  
⬜ Busca por live  
⬜ Busca por sala  
⬜ Busca por grupo  
⬜ Sugestões por interesse  
⬜ Usuários online  
⬜ Criadores em live  
⬜ Salas em destaque  
⬜ Tendências  
⬜ Trending hashtags  
⬜ Filtro por gênero  
⬜ Filtro por idade  
⬜ Filtro por região  
⬜ Filtro por idioma  
⬜ Filtro por online  
⬜ Histórico de busca  
⬜ Limpar histórico  
⬜ Controles anti-spam e anti-enumeração

> O Seven Chat não deve ter como experiência principal chat anônimo ou “roulette”. A descoberta deve estar vinculada a perfis reais dentro da plataforma.

---

## Chat privado e grupos

### Conversas 1:1

⬜ Texto  
⬜ Emojis  
⬜ Stickers  
⬜ GIFs  
⬜ Fotos  
⬜ Vídeos  
⬜ Áudios  
⬜ Arquivos permitidos  
⬜ Responder  
⬜ Encaminhar  
⬜ Copiar  
⬜ Editar  
⬜ Apagar para mim  
⬜ Apagar para todos dentro da política definida  
⬜ Reações  
⬜ Fixar mensagem  
⬜ Entregue  
⬜ Visualizado  
⬜ Digitando  
⬜ Presença  
⬜ Busca  
⬜ Silenciar  
⬜ Arquivar  
⬜ Bloquear  
⬜ Denunciar

### Mídia de visualização única

⬜ Foto de visualização única  
⬜ Vídeo de visualização única  
⬜ Expiração após primeira abertura  
⬜ URL assinada de curta duração  
⬜ Controle de abertura no servidor  
⬜ Sem cache público  
⬜ Auditoria mínima de abertura  
⬜ Limpeza automática de objeto expirado

Nenhum aplicativo consegue impedir integralmente captura externa ou gravação usando outro dispositivo. A UI deve comunicar isso corretamente.

### Grupos

⬜ Criar grupo  
⬜ Nome e foto  
⬜ Descrição  
⬜ Dono  
⬜ Administradores  
⬜ Moderadores  
⬜ Convite por link  
⬜ Aprovação de entrada  
⬜ Remover membro  
⬜ Banir membro  
⬜ Transferir propriedade  
⬜ Silenciar membro  
⬜ Permissões por papel  
⬜ Mensagem fixada  
⬜ Histórico compartilhado configurável  
⬜ Grupos privados para plano elegível  
⬜ Limite de membros configurável pelo backend

---

## Chamadas de voz e vídeo

⬜ Chamada de voz 1:1  
⬜ Chamada de vídeo 1:1  
⬜ Chamadas em grupo  
⬜ Aceitar  
⬜ Recusar  
⬜ Ocupado  
⬜ Mudo  
⬜ Desativar câmera  
⬜ Alternar câmera  
⬜ Selecionar câmera  
⬜ Selecionar microfone  
⬜ Selecionar saída de áudio  
⬜ Viva-voz  
⬜ Compartilhar tela quando suportado  
⬜ Picture-in-picture quando suportado  
⬜ Background de vídeo  
⬜ Reconexão automática  
⬜ Indicador de qualidade de rede  
⬜ Timeout de chamada  
⬜ Histórico de chamadas  
⬜ Ligação perdida  
⬜ Bloqueio de chamadas de usuário  
⬜ Permissão “quem pode me ligar”

### Estados de chamada

```text
created
ringing
accepted
connected
reconnecting
ended
missed
rejected
failed
```

Áudio e vídeo nunca devem trafegar pelo servidor HTTP principal.

---

## Salas de voz

⬜ Sala pública  
⬜ Sala privada  
⬜ Sala protegida por senha  
⬜ Sala somente por convite  
⬜ Sala exclusiva VIP  
⬜ Host  
⬜ Co-host  
⬜ Moderadores  
⬜ Até 10 pessoas no palco inicialmente  
⬜ Ouvintes adicionais  
⬜ Levantar a mão  
⬜ Aprovar entrada no palco  
⬜ Remover do palco  
⬜ Silenciar participante  
⬜ Expulsar  
⬜ Banir da sala  
⬜ Título e tema  
⬜ Tags  
⬜ Presença em tempo real  
⬜ Reações  
⬜ Presentes  
⬜ Ranking da sala  
⬜ Meta de gifts  
⬜ Convites  
⬜ Compartilhamento  
⬜ Denúncia durante sessão  
⬜ Encerramento administrativo

---

## Lives

### Transmissão

⬜ Live de vídeo  
⬜ Live somente áudio  
⬜ Qualidade adaptativa  
⬜ Reconexão  
⬜ Thumbnail  
⬜ Título  
⬜ Categoria  
⬜ Tags  
⬜ Seguidores notificados  
⬜ Contagem de espectadores  
⬜ Pico de espectadores  
⬜ Curtidas/reação em realtime  
⬜ Chat em realtime  
⬜ Presentes em realtime  
⬜ Ranking  
⬜ Meta de presentes  
⬜ Moderadores  
⬜ Fixar comentário  
⬜ Mutar usuário  
⬜ Banir usuário  
⬜ Encerrar live administrativamente  
⬜ Replay opcional  
⬜ Clips como evolução

### Multi-guest

⬜ Até 4 convidados/co-hosts inicialmente  
⬜ Convite  
⬜ Solicitação para participar  
⬜ Aceitar/recusar  
⬜ Layout dinâmico  
⬜ Mudo individual  
⬜ Remover convidado  
⬜ Troca de câmera  
⬜ Host mantém controle da sessão

### Batalhas

⬜ Live vs Live  
⬜ Convite de batalha  
⬜ Aceitar/recusar  
⬜ Cronômetro  
⬜ Placar realtime  
⬜ Pontuação por gift  
⬜ Multiplicadores por evento  
⬜ Resultado  
⬜ Histórico  
⬜ Rematch  
⬜ Rankings sazonais

### Chat da live

Permitido:

- texto;
- emojis;
- stickers aprovados;
- reações.

Não haverá upload direto de foto ou vídeo dentro do chat da live.

---

## Diamantes e carteira

**Diamantes** são a moeda virtual de consumo do Seven Chat.

### Usos

⬜ Enviar presentes  
⬜ Comprar cosméticos  
⬜ Efeitos de entrada  
⬜ Eventos especiais  
⬜ Mega Fã  
⬜ Presentear VIP quando o fluxo de loja permitir  
⬜ Itens sazonais  
⬜ Recursos premium avulsos quando aplicável

### Regras

- saldo nunca é alterado pelo frontend;
- cliente envia apenas a intenção de compra;
- servidor resolve preço e produto;
- toda operação usa idempotência;
- toda movimentação financeira é auditável;
- estorno não apaga histórico;
- chargeback gera lançamento compensatório;
- preços são versionados;
- catálogo pode variar por região e loja;
- moedas compradas via IAP não expiram onde a política da plataforma proibir;
- Diamantes promocionais devem ser distinguíveis dos comprados;
- transferência direta P2P de Diamantes não é permitida por padrão;
- presentes consomem Diamantes através de transação atômica.

### Ledger de dupla entrada

A economia deve usar **double-entry accounting** em vez de editar um campo de saldo isolado.

```text
LedgerTransaction
 ├── id
 ├── type
 ├── reference_type
 ├── reference_id
 ├── idempotency_key
 ├── status
 ├── created_at
 └── posted_at

LedgerAccount
 ├── id
 ├── owner_type
 ├── owner_id
 ├── asset
 └── status

LedgerEntry
 ├── id
 ├── transaction_id
 ├── account_id
 ├── direction
 ├── amount
 └── created_at
```

Para cada transação:

```text
total_debits == total_credits
```

O saldo é consequência do ledger, não a fonte original de verdade.

### Tipos de transação

- diamond_purchase;
- promotional_credit;
- gift_purchase;
- gift_refund;
- vip_purchase;
- vip_gift;
- mega_fan_purchase;
- reward;
- chargeback;
- refund;
- moderation_adjustment;
- creator_accrual;
- creator_payout;
- payout_reversal.

---

## Presentes virtuais

O catálogo deverá suportar aproximadamente **300 presentes** sem exigir 300 componentes hard-coded.

### Categorias

- Básicos;
- Românticos;
- Festa;
- Luxo;
- Veículos;
- Animais;
- Fantasia;
- Esportes;
- Música;
- Datas comemorativas;
- Eventos;
- VIP;
- Mega Fã;
- 3D/cinematográficos.

### Tipos

⬜ Estático  
⬜ Lottie/Rive  
⬜ Vídeo transparente quando adequado  
⬜ Tela cheia  
⬜ 3D/WebGL quando suportado  
⬜ Gift combo  
⬜ Gift streak  
⬜ Gift sazonal  
⬜ Gift exclusivo  
⬜ Gift limitado por evento  
⬜ Gift com som

### Dados do gift

```text
Gift
 ├── id
 ├── slug
 ├── name
 ├── category
 ├── price_diamonds
 ├── animation_type
 ├── asset_version
 ├── rarity
 ├── is_active
 ├── starts_at
 ├── ends_at
 └── metadata
```

### Regras

- preço vem do servidor;
- gift precisa estar ativo;
- asset é versionado;
- animações são carregadas sob demanda;
- recebimento de gift gera evento realtime;
- valor financeiro não depende do evento realtime para ser confirmado;
- ranking usa agregação derivada do ledger;
- exclusão de gift do catálogo não apaga histórico.

---

## VIP

O Seven Chat terá assinatura premium.

### Planos iniciais

| Benefício | VIP | VIP+ | Elite |
|---|:---:|:---:|:---:|
| Badge exclusivo | Sim | Sim | Sim |
| Menos anúncios tradicionais | Sim | Sim | Sim |
| Avatar GIF | Sim | Sim | Sim |
| Banner animado | Sim | Sim | Sim |
| Molduras animadas | Sim | Sim | Sim |
| Temas de perfil | Sim | Sim | Sim |
| Upload maior | Sim | Sim | Sim |
| Vídeo no chat | Sim | Sim | Sim |
| Grupos privados | — | Sim | Sim |
| Background de chamada | — | Sim | Sim |
| Efeito de entrada | — | Sim | Sim |
| Molduras adicionais | — | Sim | Sim |
| Benefícios sazonais | — | Sim | Sim |
| Prioridade de suporte | — | — | Sim |

### Assinatura

⬜ Mensal  
⬜ Renovação automática quando suportada  
⬜ Cancelamento  
⬜ Expiração  
⬜ Grace period  
⬜ Billing retry  
⬜ Restore purchases  
⬜ Webhook/notificação de loja  
⬜ Histórico de assinatura  
⬜ Estado server-side

### Estados

```text
pending
active
grace_period
past_due
canceled
expired
refunded
revoked
```

### Presentear VIP

⬜ Presente de 1 mês  
⬜ Confirmação antes da compra  
⬜ Idempotência  
⬜ Histórico  
⬜ Não converter VIP de volta em Diamantes  
⬜ Reembolso somente conforme regras do provedor/loja  
⬜ Prevenir repetição acidental de compra

---

## Mega Fã

**Mega Fã** é separado do VIP.

### Conceito

- status ligado a um criador/perfil;
- comprado com Diamantes;
- duração definida;
- badge próprio;
- moldura específica;
- destaque em comentários e lives;
- ranking de apoio;
- benefícios cosméticos/configuráveis.

VIP não concede Mega Fã automaticamente.

### Dados

```text
FanMembership
 ├── fan_user_id
 ├── creator_user_id
 ├── tier
 ├── starts_at
 ├── ends_at
 ├── status
 └── source_transaction_id
```

---

## Criadores e monetização

O sistema pode incluir um programa de criadores separado da compra de Diamantes.

⬜ Cadastro como criador  
⬜ Termos específicos  
⬜ Perfil de criador  
⬜ Dashboard de ganhos  
⬜ Ganhos elegíveis por gifts  
⬜ Histórico de receita  
⬜ Saldo pendente  
⬜ Saldo liberado  
⬜ Solicitação de saque  
⬜ Estado do saque  
⬜ Histórico de saques  
⬜ Impostos/documentos quando aplicável  
⬜ KYC quando exigido  
⬜ Antifraude  
⬜ Retenção/revisão de valores suspeitos  
⬜ Reversão por chargeback

### Regra crítica

**Diamantes e receita de criador não são a mesma coisa.**

```text
Diamantes = moeda virtual de consumo do usuário
Receita do criador = obrigação financeira calculada pelas regras do programa
```

O criador não “saca Diamantes”. O backend calcula receita elegível a partir de eventos financeiros confirmados.

Requisitos de idade, KYC, pagamento e responsável legal podem variar por país/provedor. Essas regras pertencem ao compliance financeiro, não ao catálogo social geral do app.

---

## Anúncios recompensados

⬜ Anúncio voluntário  
⬜ Recompensa definida pelo backend  
⬜ Diamantes/créditos promocionais  
⬜ Limite diário  
⬜ Cooldown  
⬜ Detecção de repetição  
⬜ Server-side verification  
⬜ Nonce/idempotência  
⬜ Proteção contra replay  
⬜ Métricas de fraude

Créditos promocionais devem ser distinguíveis dos Diamantes comprados quando as regras econômicas forem diferentes.

---

## Notificações

### Eventos

⬜ Nova mensagem  
⬜ Menção  
⬜ Resposta  
⬜ Novo seguidor  
⬜ Solicitação aceita  
⬜ Curtida  
⬜ Comentário  
⬜ Compartilhamento  
⬜ Ligação recebida  
⬜ Ligação perdida  
⬜ Convite de sala  
⬜ Convite de live  
⬜ Convite de batalha  
⬜ Presente recebido  
⬜ VIP recebido  
⬜ Mega Fã  
⬜ Live iniciada  
⬜ Evento  
⬜ Moderação  
⬜ Segurança  
⬜ Pagamento  
⬜ Assinatura

### Canais

- in-app;
- push;
- e-mail para eventos relevantes;
- realtime enquanto conectado.

### Preferências

⬜ Configuração por categoria  
⬜ Modo silencioso  
⬜ Não perturbe  
⬜ Badge count  
⬜ Deep link correto  
⬜ Deduplicação  
⬜ TTL de notificação

---

## Moderação e segurança

### UGC

Todo conteúdo gerado pelo usuário deve permitir moderação adequada.

⬜ Denunciar perfil  
⬜ Denunciar post  
⬜ Denunciar comentário  
⬜ Denunciar reel  
⬜ Denunciar story  
⬜ Denunciar mensagem  
⬜ Denunciar grupo  
⬜ Denunciar sala  
⬜ Denunciar live  
⬜ Denunciar gift/asset se necessário  
⬜ Bloquear usuário  
⬜ Silenciar usuário  
⬜ Ocultar conteúdo  
⬜ Motivos padronizados  
⬜ Texto complementar  
⬜ Evidência vinculada à denúncia  
⬜ Fila de moderação  
⬜ SLA por severidade  
⬜ Apelação

### Ações

```text
warning
content_removed
feature_restricted
temporary_suspension
permanent_ban
financial_hold
live_terminated
room_terminated
```

### Segurança geral

⬜ Rate limiting  
⬜ Anti-bruteforce  
⬜ Anti-spam  
⬜ Anti-scraping  
⬜ Anti-enumeração  
⬜ Detecção de sessão suspeita  
⬜ Proteção de upload  
⬜ URLs assinadas  
⬜ CSP  
⬜ CORS restritivo  
⬜ CSRF quando aplicável  
⬜ Cookies seguros quando aplicável  
⬜ Sanitização de HTML/Markdown  
⬜ Validação MIME real  
⬜ Proteção contra SSRF  
⬜ Proteção contra IDOR  
⬜ Autorização por recurso  
⬜ Auditoria administrativa  
⬜ Secrets fora do código  
⬜ Rotação de secrets  
⬜ Dependabot/renovação equivalente  
⬜ SAST  
⬜ Dependency scanning

### Segurança infantil obrigatória da plataforma

Mesmo sem criar funções sociais diferentes por idade, o Seven Chat deve:

- publicar padrão explícito contra abuso e exploração sexual infantil;
- ter mecanismo de denúncia;
- responder a conteúdo ilegal conforme legislação aplicável;
- manter ponto de contato para segurança infantil;
- cumprir requisitos obrigatórios das lojas e regiões onde for distribuído.

---

## Painel administrativo

### Usuários

⬜ Buscar usuário  
⬜ Visualizar perfil  
⬜ Sessões  
⬜ Histórico de segurança  
⬜ Histórico de punições  
⬜ Restringir  
⬜ Suspender  
⬜ Banir  
⬜ Revogar sessões

### Conteúdo

⬜ Posts  
⬜ Reels  
⬜ Stories  
⬜ Comentários  
⬜ Mensagens reportadas  
⬜ Grupos  
⬜ Salas  
⬜ Lives

### Economia

⬜ Pacotes de Diamantes  
⬜ Gifts  
⬜ Assets  
⬜ Preços  
⬜ VIP  
⬜ Mega Fã  
⬜ Transações  
⬜ Reembolsos  
⬜ Chargebacks  
⬜ Ajustes financeiros com dupla aprovação quando necessário  
⬜ Reconciliação  
⬜ Creator payouts

### Operação

⬜ Feature flags  
⬜ Configuração regional  
⬜ Eventos  
⬜ Missões  
⬜ Cupons  
⬜ Notificações  
⬜ Status da plataforma  
⬜ Jobs  
⬜ Métricas  
⬜ Logs  
⬜ Auditoria

### RBAC

Papéis iniciais:

```text
support
moderator
senior_moderator
finance
content_manager
operations
admin
owner
```

Toda ação sensível deve registrar:

- ator;
- alvo;
- ação;
- motivo;
- antes/depois quando aplicável;
- timestamp;
- correlation_id.

---

## Privacidade e compliance

O projeto deve ser preparado para:

- LGPD;
- GDPR quando aplicável;
- legislação local;
- requisitos de App Store;
- requisitos de Google Play;
- política de UGC;
- política de pagamentos;
- segurança infantil;
- classificação indicativa/IARC quando aplicável.

### Direitos do usuário

⬜ Exportar dados  
⬜ Excluir conta  
⬜ Corrigir dados  
⬜ Baixar histórico permitido  
⬜ Revogar sessões  
⬜ Ajustar privacidade  
⬜ Gerenciar notificações  
⬜ Gerenciar consentimentos

### Retenção

Cada categoria de dado deve ter política própria:

```text
auth
messages
media
payments
ledger
moderation
audit
notifications
analytics
deleted_accounts
```

Dados financeiros e de auditoria podem exigir retenção superior à de conteúdo social.

---

# Arquitetura

## Arquitetura

### Estrutura recomendada

```text
apps/
├── web/                 # Next.js / React
├── mobile/              # Expo / React Native
├── admin/               # Painel administrativo
└── realtime/            # Gateway persistente

services/
├── api/                 # API e domínio
├── worker/              # Jobs assíncronos
└── rtc/                 # Integração/sinalização RTC

packages/
├── contracts/           # Tipos/schemas compartilhados
├── ui/                  # Design system
├── config/              # Configuração compartilhada
├── observability/       # Logs/tracing/metrics
└── test-utils/
```

### Stack sugerida

| Camada | Tecnologia |
|---|---|
| Web | Next.js App Router + React + TypeScript |
| Mobile | Expo + React Native + TypeScript |
| UI | Tailwind CSS + shadcn/ui no web |
| Server state | TanStack Query |
| API | Backend modular tipado |
| Banco | PostgreSQL / Neon |
| ORM | Prisma ou camada equivalente |
| Cache | Redis / Upstash |
| Realtime | Gateway WebSocket persistente |
| RTC | WebRTC + LiveKit ou mediasoup |
| TURN | coturn |
| Storage | S3-compatible |
| Jobs | Fila durável |
| Observabilidade | Sentry + OpenTelemetry + logs estruturados |
| Push | FCM + APNs |
| Web hosting | Vercel |
| Serviços persistentes | infraestrutura dedicada |

### Princípio

Serverless é adequado para Web/BFF e endpoints stateless.

Não deve hospedar o núcleo persistente de:

- WebSockets de longa duração;
- presença;
- SFU;
- TURN;
- workers contínuos.

---

## Domínios e entidades

### Identidade

```text
User
Profile
UserEmail
UserSession
UserDevice
UserConsent
UserBlock
UserPreference
```

### Social

```text
Follow
FollowRequest
Post
PostMedia
Story
StoryView
StoryHighlight
Reel
Comment
Reaction
Bookmark
Hashtag
Mention
```

### Chat

```text
Conversation
ConversationMember
Message
MessageMedia
MessageReaction
MessageReceipt
GroupInvite
```

### Realtime

```text
Presence
Room
RoomMember
RoomBan
Call
CallParticipant
LiveSession
LiveGuest
LiveModerator
LiveViewer
LiveBattle
LiveBattleParticipant
```

### Economia

```text
LedgerAccount
LedgerTransaction
LedgerEntry
DiamondPackage
Gift
GiftAsset
GiftTransaction
VipPlan
VipSubscription
VipGift
FanMembership
RewardedAd
CreatorAccount
CreatorEarning
CreatorPayout
Payment
Refund
Chargeback
```

### Plataforma

```text
Notification
Report
ModerationCase
ModerationAction
AuditLog
FeatureFlag
Experiment
WebhookEvent
OutboxEvent
JobExecution
```

---

## Banco de dados

### Regras

- PostgreSQL como fonte principal;
- IDs não sequenciais expostos externamente;
- `created_at` e `updated_at` padronizados;
- soft delete apenas onde fizer sentido;
- ledger nunca usa soft delete;
- dados financeiros imutáveis;
- constraints no banco além da validação da aplicação;
- FKs onde o custo operacional permitir;
- migrations forward-safe;
- índices baseados em queries reais;
- nenhuma paginação pesada com OFFSET em feeds grandes.

### Índices iniciais

```text
users(email UNIQUE)
users(username UNIQUE)
profiles(user_id UNIQUE)

follows(follower_id, following_id UNIQUE)
follows(following_id, created_at DESC)

posts(author_id, created_at DESC)
posts(created_at DESC)
comments(post_id, created_at DESC)

story_views(story_id, viewer_id UNIQUE)
bookmarks(user_id, created_at DESC)

conversation_members(user_id, conversation_id)
messages(conversation_id, created_at DESC)
message_receipts(message_id, user_id UNIQUE)

live_sessions(status, started_at DESC)
room_members(room_id, user_id)

ledger_transactions(idempotency_key UNIQUE)
ledger_entries(transaction_id)
ledger_entries(account_id, created_at DESC)

gift_transactions(sender_id, created_at DESC)
gift_transactions(receiver_id, created_at DESC)

notifications(user_id, read_at, created_at DESC)
reports(status, priority, created_at)
audit_logs(actor_id, created_at DESC)
```

Queries críticas devem ser validadas com `EXPLAIN ANALYZE`.

---

## Realtime

Realtime deve ser usado para eventos transitórios e atualização imediata, não como única persistência.

### Eventos

```text
presence.updated
message.created
message.updated
message.deleted
message.read
typing.started
typing.stopped

call.ringing
call.accepted
call.ended

room.joined
room.left
room.stage.updated

live.started
live.ended
live.viewer_count
live.comment.created
live.gift.received
live.battle.updated

notification.created
```

### Requisitos

- autenticação no handshake;
- autorização por canal;
- heartbeat;
- reconnect com backoff;
- resync após reconexão;
- sequence/version quando necessário;
- idempotência;
- proteção contra replay;
- limite de eventos por conexão;
- fan-out escalável;
- observabilidade por conexão.

---

## Voz e vídeo / RTC

### Componentes

```text
Client
  │
  ├── API: autorização/token
  │
  ├── Realtime: sinalização/eventos
  │
  └── WebRTC
        ├── STUN
        ├── TURN
        └── SFU
```

### Requisitos

- tokens RTC de curta duração;
- permissões por sala;
- reconexão;
- adaptive bitrate;
- simulcast/SVC quando suportado;
- TURN fallback;
- métricas de jitter;
- packet loss;
- RTT;
- bitrate;
- duração;
- falhas por plataforma.

---

## Mídia e storage

### Fluxo

```text
Cliente
  │
  ├── solicita upload
  ▼
API autoriza
  │
  ▼
URL assinada
  │
  ▼
Storage privado
  │
  ├── validação
  ├── scan
  ├── remoção de metadata
  ├── thumbnail
  ├── transcode
  └── moderação
  │
  ▼
Asset pronto
  │
  ▼
CDN / URL assinada
```

### Requisitos

- bucket privado por padrão;
- limite por tipo;
- validação por magic bytes;
- MIME não confiável vindo do cliente;
- nomes aleatórios;
- checksum;
- antivírus quando aplicável;
- remoção de EXIF desnecessário;
- transcode de vídeo;
- múltiplas resoluções;
- thumbnail;
- duração máxima;
- quarantine;
- asset status;
- cleanup de upload abandonado;
- lifecycle rules.

### Estados

```text
pending_upload
uploaded
processing
ready
rejected
failed
deleted
```

---

## API

### Versionamento

```text
/api/v1/*
```

### Grupos

```text
/api/v1/auth/*
/api/v1/users/*
/api/v1/profiles/*
/api/v1/follows/*
/api/v1/feed/*
/api/v1/posts/*
/api/v1/stories/*
/api/v1/reels/*
/api/v1/search/*
/api/v1/chat/*
/api/v1/groups/*
/api/v1/rooms/*
/api/v1/lives/*
/api/v1/calls/*
/api/v1/wallet/*
/api/v1/gifts/*
/api/v1/vip/*
/api/v1/fans/*
/api/v1/creators/*
/api/v1/payments/*
/api/v1/notifications/*
/api/v1/reports/*
/api/v1/admin/*
/api/v1/webhooks/*
```

### Regras

- contratos tipados;
- validação estrita;
- autorização server-side;
- cursor pagination;
- idempotency keys;
- erros estáveis;
- correlation ID;
- rate limit;
- versionamento;
- nunca retornar dados internos por padrão;
- DTO/Resource explícito;
- limites de payload;
- timeouts;
- cancelamento quando possível.

### Padrão de erro

```json
{
  "error": {
    "code": "GIFT_INSUFFICIENT_BALANCE",
    "message": "Saldo insuficiente.",
    "requestId": "..."
  }
}
```

---

## Pagamentos

### Canais

- Apple In-App Purchase / StoreKit para bens digitais no iOS quando exigido;
- Google Play Billing para bens digitais no Android quando exigido;
- web checkout apenas dentro das regras regionais e das lojas;
- gateway web regional quando permitido.

### Produtos

⬜ Pacote de Diamantes  
⬜ VIP  
⬜ Gift de VIP quando suportado  
⬜ Produtos digitais futuros

### Regras críticas

- preço nunca vem como verdade do frontend;
- produto resolve por SKU;
- validar recibo/token no backend;
- persistir ID externo;
- webhooks idempotentes;
- assinatura de webhook validada;
- estados de pagamento explícitos;
- reconciliação agendada;
- reembolso e chargeback;
- restore purchases;
- grace period de assinatura;
- retries;
- produtos inativos não podem ser vendidos;
- mesma transação externa não pode creditar duas vezes.

### Estados de pagamento

```text
created
pending
authorized
paid
failed
canceled
refunded
partially_refunded
chargeback
```

### Loja mobile

Diamantes e benefícios digitais devem seguir a política de billing de cada loja.

Moeda virtual comprada no Google Play deve permanecer restrita ao app/título correspondente.

Moeda/crédito comprado via IAP no ecossistema Apple não deve expirar quando a política vigente assim exigir.

---

## Filas e jobs

Jobs recomendados:

- processamento de vídeo;
- thumbnails;
- limpeza de mídia;
- push notifications;
- e-mails;
- fan-out de feed;
- agregação de métricas;
- reconciliação financeira;
- expiração de stories;
- expiração de Mega Fã;
- renovação/atualização de assinatura;
- reprocessamento de webhook;
- moderação assíncrona;
- exportação de dados;
- exclusão de conta;
- creator payout;
- cleanup de sessão.

### Requisitos

- retry com backoff;
- dead-letter queue;
- idempotência;
- timeout;
- concurrency limit;
- métricas;
- trace/correlation ID.

---

## Cache e rate limiting

### Cache

Pode armazenar:

- perfil público;
- contadores derivados;
- feed parcial;
- catálogo;
- gifts;
- planos;
- feature flags;
- tendências.

Não deve ser fonte de verdade para:

- saldo;
- pagamento;
- ledger;
- estado final de assinatura;
- punição crítica.

### Rate limits

Devem existir limites específicos para:

- login;
- recuperação de senha;
- cadastro;
- busca;
- mensagens;
- uploads;
- comentários;
- follows;
- gifts;
- criação de live;
- chamadas;
- denúncias;
- APIs administrativas.

---

## Busca

### MVP

PostgreSQL full-text quando suficiente.

### Escala

Migrar para engine dedicada apenas quando necessário.

Indexáveis:

- username;
- nome;
- bio pública;
- hashtags;
- posts públicos;
- reels públicos;
- salas;
- lives.

Conteúdo privado não entra em índice público.

---

## Observabilidade

### Logs

Logs estruturados com:

- timestamp;
- service;
- environment;
- request_id;
- trace_id;
- user_id pseudonimizado quando necessário;
- route/event;
- duration;
- outcome.

### Métricas

⬜ API latency  
⬜ Error rate  
⬜ DB latency  
⬜ Cache hit rate  
⬜ Queue depth  
⬜ Job failures  
⬜ WebSocket connections  
⬜ Reconnect rate  
⬜ Messages/sec  
⬜ RTC connection success  
⬜ RTT/jitter/packet loss  
⬜ Live viewers  
⬜ Gift transaction failures  
⬜ Payment failures  
⬜ Webhook lag  
⬜ Push delivery  
⬜ Crash-free sessions  
⬜ Moderation backlog

### Alertas

P0/P1:

- pagamentos duplicando;
- ledger inconsistente;
- impossibilidade de login;
- chat indisponível;
- RTC indisponível;
- DB indisponível;
- perda de eventos;
- fila crescendo sem consumo;
- taxa alta de erro;
- storage indisponível.

### Nunca logar

- senha;
- token completo;
- cookie;
- segredo;
- número completo de cartão;
- conteúdo privado desnecessário.

---

## Backup e recuperação

### Banco

- backups automáticos;
- point-in-time recovery quando disponível;
- retenção definida;
- restore test periódico.

### Storage

- versionamento quando adequado;
- lifecycle;
- replicação/backup conforme criticidade.

### RPO/RTO

Metas iniciais:

```text
RPO crítico financeiro: <= 5 min
RPO social:            <= 15 min

RTO crítico:           <= 60 min
```

Metas finais devem ser validadas pelo custo de infraestrutura.

### Disaster recovery

⬜ Runbook  
⬜ Restore test  
⬜ Rotação de credenciais  
⬜ Failover documentado  
⬜ Comunicação de incidente  
⬜ Pós-mortem

---

## Performance e escala

### Feed

- cursor;
- cache;
- ranking assíncrono;
- fan-out híbrido;
- evitar N+1;
- CDN;
- prefetch controlado.

### Chat

- índice por conversation + timestamp;
- paginação reversa;
- anexos fora do DB;
- presença fora do PostgreSQL;
- receipts em lote quando possível.

### Reels

- CDN;
- HLS/DASH quando adequado;
- preload mínimo;
- bitrate adaptativo;
- thumbnails;
- evitar baixar próximo vídeo inteiro antecipadamente.

### Lives

- mídia via SFU/CDN;
- contadores agregados;
- gifts confirmados no domínio financeiro;
- eventos realtime desacoplados do ledger;
- degradação graciosa de animações.

### Economia

- transação ACID;
- lock/serialização adequada;
- idempotência;
- dupla entrada;
- reconciliação;
- nenhuma confirmação financeira baseada apenas em WebSocket.

---

## Acessibilidade

⬜ Navegação por teclado no web  
⬜ Focus visible  
⬜ ARIA labels  
⬜ Semântica correta  
⬜ Contraste WCAG  
⬜ Texto escalável  
⬜ Screen reader  
⬜ Legendas em mídia quando disponíveis  
⬜ Reduced motion  
⬜ Estados não comunicados apenas por cor  
⬜ Alvos de toque adequados

---

## Internacionalização

Objetivo inicial: preparar a interface para **12 idiomas**.

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

Requisitos:

- ICU/Intl;
- pluralização;
- moeda local;
- timezone;
- formato de data;
- RTL;
- textos fora do código;
- fallback;
- conteúdo do usuário não traduzido automaticamente sem recurso explícito.

---

## Design e UX

### Identidade

- roxo como cor principal;
- visual moderno;
- dark/light mode;
- mobile-first;
- sidebar no desktop;
- microinterações;
- gifts visualmente fortes sem travar o app;
- animações respeitando reduced motion.

### Navegação principal

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

### Princípios

1. Segurança nunca fica atrás de VIP.
2. Bloquear e denunciar ficam acessíveis.
3. Sair de chamada/live exige no máximo um toque após a UI estar visível.
4. Compra mostra preço e produto claramente.
5. Saldo exibido vem do backend.
6. Gifts não bloqueiam interação.
7. Rede ruim deve degradar qualidade antes de quebrar sessão.
8. Empty/loading/error states são obrigatórios.
9. Toda ação destrutiva importante exige confirmação.
10. A interface mantém identidade própria do Seven Chat.

---

## Testes

### Unitários

- auth;
- idade 13–99;
- username;
- follow;
- privacidade;
- bloqueio;
- permissões;
- feed ranking;
- expiração de story;
- chat;
- grupos;
- gifts;
- ledger;
- VIP;
- Mega Fã;
- creator earnings;
- pagamentos;
- moderação.

### Integração

- cadastro;
- login;
- sessões;
- upload;
- chat;
- realtime;
- gifts;
- compras;
- webhooks;
- assinatura;
- denúncia;
- admin;
- payout.

### E2E

Fluxos mínimos:

1. cadastro → perfil → follow → feed;
2. post → comentário → reação → denúncia;
3. chat → foto → visualização única;
4. chamada → aceitar → reconectar → encerrar;
5. sala → palco → moderar → gift;
6. live → convidado → gift → batalha;
7. compra → Diamantes → gift → ledger;
8. VIP → renovar → cancelar → expirar;
9. presentear VIP;
10. Mega Fã;
11. bloquear usuário;
12. suspender conta;
13. exclusão de conta;
14. exportação de dados.

### Financeiro

- idempotência;
- dupla entrada;
- debits == credits;
- corrida de saldo;
- retry de webhook;
- webhook duplicado;
- refund;
- chargeback;
- reconciliação.

### Segurança

- IDOR;
- broken authorization;
- brute force;
- rate limit;
- XSS;
- CSRF quando aplicável;
- SSRF;
- upload malicioso;
- token expirado;
- token reutilizado;
- privilege escalation.

### Carga

- logins por segundo;
- mensagens por segundo;
- conexões realtime;
- viewers por live;
- gifts por segundo;
- comentários por segundo;
- push fan-out;
- queries de feed;
- pagamentos concorrentes.

---

## CI/CD

Pipeline:

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
security checks
  ↓
build
  ↓
migration validation
  ↓
preview/staging
  ↓
E2E
  ↓
production
```

### Regras

- branch protection;
- PR review;
- migrations revisadas;
- preview;
- secret scanning;
- dependency scanning;
- rollback;
- releases versionadas;
- changelog;
- artefatos assinados quando aplicável.

---

## Ambientes

```text
local
development
preview
staging
production
```

Nunca compartilhar:

- banco;
- storage privado;
- chaves;
- tokens;
- webhooks;
- credenciais.

entre staging e produção.

---

## Roadmap

### Fase 0 — Fundação

⬜ Monorepo  
⬜ Design system  
⬜ Banco  
⬜ Auth  
⬜ Storage  
⬜ Redis  
⬜ Observabilidade  
⬜ CI/CD  
⬜ Feature flags  
⬜ Segurança base

### Fase 1 — Social

⬜ Perfil  
⬜ Follow  
⬜ Feed  
⬜ Posts  
⬜ Comentários  
⬜ Stories  
⬜ Reels  
⬜ Busca

### Fase 2 — Chat

⬜ Conversas  
⬜ Grupos  
⬜ Mídia  
⬜ Visualização única  
⬜ Áudio  
⬜ Presence  
⬜ Push

### Fase 3 — Voz e vídeo

⬜ WebRTC  
⬜ TURN  
⬜ Chamadas  
⬜ Reconnect  
⬜ Salas  
⬜ Palco

### Fase 4 — Economia

⬜ Ledger  
⬜ Diamantes  
⬜ Store billing  
⬜ Gifts  
⬜ VIP  
⬜ Presentear VIP  
⬜ Mega Fã  
⬜ Ads recompensados

### Fase 5 — Lives

⬜ Live  
⬜ Multi-guest  
⬜ Chat  
⬜ Gifts realtime  
⬜ Rankings  
⬜ Batalhas  
⬜ Eventos

### Fase 6 — Criadores

⬜ Creator program  
⬜ Ganhos  
⬜ KYC quando necessário  
⬜ Payout  
⬜ Reconciliação  
⬜ Antifraude

### Fase 7 — Hardening

⬜ Admin completo  
⬜ Moderação  
⬜ Load tests  
⬜ Pentest  
⬜ DR test  
⬜ Compliance  
⬜ Store readiness  
⬜ Performance final

---

## Critérios de lançamento 1.0

### P0 — obrigatório

- cadastro 13–99;
- login;
- perfil com idade;
- follow;
- feed;
- posts;
- comentários;
- reels;
- chat;
- grupos;
- chamadas;
- salas;
- lives;
- Diamantes;
- gifts;
- VIP;
- Mega Fã;
- notificações;
- bloqueio;
- denúncia;
- admin;
- observabilidade;
- backup;
- pagamentos;
- políticas legais;
- Android;
- iOS;
- Web.

### P1 — precisa estar pronto para 1.0

- stories;
- live multi-guest;
- batalhas;
- gifts animados;
- visualização única;
- creator dashboard;
- ads recompensados;
- exportação de dados;
- exclusão de conta;
- testes de carga;
- recuperação testada.

### P2 — pode entrar após 1.0

- clips;
- chamadas com grande número de participantes;
- ranking global avançado;
- marketplace cosmético;
- recursos experimentais.

### Gate final

A release 1.0 não deve sair com:

- mock de pagamento;
- saldo falso;
- gifts decorativos sem transação;
- live simulada;
- chamada simulada;
- chat local-only;
- moderação inexistente;
- admin sem autorização;
- storage público de mídia privada;
- secrets no repositório;
- migrations não testadas;
- erros críticos conhecidos.

---

## Métricas de produto

- DAU/MAU;
- retenção D1/D7/D30;
- sessões por usuário;
- follows por usuário;
- mensagens entregues;
- chamadas concluídas;
- salas criadas;
- viewers por live;
- creators ativos;
- conversão VIP;
- compradores de Diamantes;
- ARPPU;
- gifts por live;
- chargeback rate;
- report rate;
- tempo de moderação;
- crash-free sessions;
- RTC success rate;
- push delivery rate.

---

## Referências de produto

O Seven Chat observa padrões de mercado sem copiar implementação ou identidade.

### Litmatch

Referências:

- descoberta social;
- interação rápida;
- voice party;
- personalização.

### BIGO LIVE

Referências:

- lives;
- multi-guest;
- PK battles;
- gifts;
- comunidade ao vivo.

### Tango

Referências:

- gifts;
- subscriptions;
- fan levels;
- creator monetization;
- eventos.

### Azar

Referências:

- descoberta;
- filtros;
- experiência de vídeo;
- premium.

### Discord

Referências:

- personalização premium;
- avatar animado;
- banner;
- temas;
- background de chamada;
- uploads maiores.

O Seven Chat deve manter nomenclatura, UX, design, assets e código próprios.

---

## Segurança de segredos

Nunca commitar:

```text
.env
.env.*
*.pem
*.key
service-account.json
credentials.json
cookies.txt
tokens.txt
```

O `.env.example` deve conter apenas placeholders.

---

## Definição de pronto

Uma funcionalidade só é considerada pronta quando possui:

- regra de negócio;
- validação;
- autorização;
- tratamento de erro;
- loading;
- empty state;
- error state;
- acessibilidade;
- logs;
- métricas;
- testes;
- documentação;
- observabilidade;
- comportamento web/mobile validado;
- segurança revisada quando aplicável;
- rollback/migração quando aplicável.

---

## Licença

**Proprietary / All rights reserved**, salvo decisão futura em contrário.

Código, marca, assets e identidade do Seven Chat não podem ser redistribuídos ou reutilizados sem autorização do proprietário.

---

## Autor

Desenvolvido por **gabriell211**.

Repositório: https://github.com/gabriell211/seven-chat

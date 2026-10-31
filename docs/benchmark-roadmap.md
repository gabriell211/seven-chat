# Seven Chat — Benchmark de produto (31/10/2026)

## Premissa

Objetivo: uma rede social **própria**, Android nativo em Java, com qualidade de produção. Recursos de outras plataformas são referências de experiência, não autorização para copiar código, marca ou componentes.

**Estado verificado:** app 0.1.x offline com um único perfil local e publicações persistidas em SQLite. O app não possui atualmente usuários reais, autenticação, backend, mensagens em rede, chamadas nem checkout. Nenhuma tela planejada equivale a implementação pronta.

## Comparação e lacunas

| Experiência | Referência | Entrega atual | Falta para produção |
| --- | --- | --- | --- |
| Feed / posts | Instagram e TikTok | Texto, foto, curtir, comentar, salvar, buscar, editar, arquivar, restaurar, compartilhamento via Android e rascunhos locais | Feed multiusuário, seguidores, paginação por cursor, mídia otimizada, autorização e relatórios |
| Descoberta | TikTok — Para você / Seguindo, não tenho interesse | Busca local por legenda e favoritos | Recomendação no backend, filtros de privacidade, bloqueios e sinais de desinteresse |
| Chat | WhatsApp — conversas, grupos, mensagens temporárias | Tela de escopo; sem mensagens funcionais | Gateway WebSocket, entregas, recibos, retenção, autenticação e controles de abuso |
| Salas e comunidades | Discord — permissões e AutoMod | Tela de escopo | ACL por papel, convites, salas WebRTC, presença, filtros e moderação |
| Stories e vídeo | Instagram e TikTok | Não implementados | Upload seguro, transcoding, CDN, stories com expiração, reels e player |
| Lives e presentes | Plataformas de live | Não implementados | RTC/SFU, assentos, gifts, ledger imutável, antifraude, reconciliação |
| Seven VIP | Produtos de assinatura | Tela informativa, sem liberar VIP | Catálogo de benefícios server-side, Google Play Billing, verificação de recibos, renovação/cancelamento |
| Segurança | Apps sociais maduros | Validação local básica e armazenamento sem backup automático | LGPD, denúncia, bloqueio, segurança para adolescentes, rate limit, auditoria, observabilidade |

Referências de funcionalidades:
- [Instagram — conexão, reposts e Friends](https://about.fb.com/news/2025/08/new-instagram-features-help-you-connect/)
- [Instagram — Instants](https://about.fb.com/news/2026/05/instants-share-in-the-moment/)
- [TikTok — como recomenda conteúdo](https://support.tiktok.com/pt_BR/using-tiktok/exploring-videos/how-tiktok-recommends-content)
- [WhatsApp — mensagens temporárias](https://faq.whatsapp.com/673193694148537)
- [Discord — AutoMod](https://support.discord.com/hc/pt-br/articles/4421269296535-FAQ-do-AutoMod)
- [Android — arquitetura recomendada](https://developer.android.com/topic/architecture)

## Entrega deste ciclo: feed offline confiável

- Migração SQLite v1 → v2 **sem apagar posts ou comentários existentes**.
- Rascunho persistente, edição de legenda, arquivo/restauração, compartilhamento pelo seletor nativo.
- Preservação da navegação após rotação e reaproveitamento de permissões de leitura de foto.
- Testes com Robolectric para rascunhos, edição, arquivo, busca literal, exclusão em cascata e migração v1.

**Limites:** o app continua offline. Arquivar uma publicação é diferente de escolher audiência; não existe algoritmo, recomendação ou moderação remota nesta versão.

## Roadmap por critérios de aceite

### P0 — Identidade e backend seguros (próxima prioridade)

- [ ] Separar `MainActivity` em Activities/Fragments + ViewModels ou Presenter, `Repository` e `ApiClient` Java.
- [ ] Backend com persistência PostgreSQL, migrations e logs; contrato OpenAPI.
- [ ] Cadastro/login real, validação de e-mail, Google OAuth, recuperação, revogação de sessões.
- [ ] Perfis, fotos, seguidores, bloqueio e conta privada com autorização no **servidor**.
- [ ] API de posts, comentários, curtir/salvar, mídia, paginação por cursor e sincronização offline.
- [ ] Segurança: validação no servidor, mídia privada, rate limits, proteção a abuso e auditoria.
- [ ] E2E em dois usuários/dispositivos: criar post, seguir, bloquear, remover e editar.

### P1 — Comunicação profissional

- [ ] Chat 1:1 e grupos via gateway persistente (não hospedado em função serverless curta).
- [ ] Mensagens idempotentes, entregues/lidas, reconexão, anexos e notificações FCM.
- [ ] Silenciar, arquivar, bloquear, denunciar, retenção/expiração e políticas de mídia.
- [ ] Testes de rede ruim, offline, duplicação, revogação de acesso e spam.

### P2 — Mídia e social

- [ ] Stories 24 horas, destaques, reels, feed personalizado, recomendações e busca.
- [ ] Upload por URL assinada, antivírus, thumbnails, transcoding, CDN e política de conteúdos.
- [ ] Acessibilidade, internacionalização e testes de consumo de memória/bateria.

### P3 — Voz, lives, economia e Seven VIP

- [ ] WebRTC com serviço especializado para voz, salas, lives e convidados.
- [ ] Presentes e carteira com ledger auditável e reconciliação financeira.
- [ ] Google Play Billing e backend de entitlement VIP; não confiar em preferências do aparelho.
- [ ] Grupos/salas VIP, GIFs, molduras, benefícios por conta e expiração real.
- [ ] Regras por idade e região, denúncia, antifraude e critérios da Google Play.

### P4 — Qualidade de distribuição

- [ ] Testes unitários, instrumentados, integração e E2E Android.
- [ ] CI de lint, build, testes, scanner de dependências e assinatura segura.
- [ ] APK/AAB versão, crash reporting, beta fechado, documentação LGPD e revisão de segurança.
- [ ] Carga, latência, disponibilidade, backup/restauração e testes de falhas.

## Contrato de qualidade

- Não publicar como versão 1.0 funcional enquanto o P0–P3 não tiver testes e infraestrutura reais.
- Não inserir dados falsos de usuários para dar aparência de rede ativa.
- Não marcar VIP ativo sem recibo validado no backend.
- Não enviar dados pessoais ou fotos sem consentimento e controles de privacidade.
- Para cada funcionalidade: fluxo feliz, autorização, offline, erro de rede, input inválido e recuperação.

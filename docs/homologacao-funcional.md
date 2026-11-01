# Seven Chat — homologação funcional (01/11/2026)

## Critério de aprovação
A certificação de produção continua **fail-closed**. Os itens do manifesto representam funcionalidades completas, não só a existência de uma página, a compilação ou um subconjunto de endpoints. Testes não são mocks: o CI inicia PostgreSQL 17 e Java 21 e liga o app Android emulado à API local.

## Evidências recentes (todas na PR #10)

| Etapa | Run | Resultado |
| --- | --- | --- |
| Backend Spring Boot + PostgreSQL 17, Flyway V1–V4, autorização e HTTP | [41332443082](https://github.com/gabriell211/seven-chat/actions/runs/41332443082) | **30/30 testes, 0 falhas, 0 warnings de build** |
| Android Java, testes unitários, APK de instrumentação e APK do app | [41332443076](https://github.com/gabriell211/seven-chat/actions/runs/41332443076) | **success**, 0 warnings de build |
| Android 35 emulado + Java API localhost + PostgreSQL temporário | [41332443071](https://github.com/gabriell211/seven-chat/actions/runs/41332443071) | **5/5 testes instrumentados, 0 falhas, 0 warnings de build** |

Os cinco testes instrumentados estão em `RealBackendInstrumentationTest` e `RealPagesInstrumentationTest`, além de testes Java com HTTP MockMvc, Spring Boot e PostgreSQL real.

## Funcionalidades implementadas e realmente exercitadas

- **Cadastro, login e sessões:** formulário Android real, tokens revogáveis, bloqueio de tentativas e isolamento de contas.
- **Feed, busca, perfil, publicação, curtidas, comentários, salvos, seguidores e notificações:** dados reais no banco, autorização e testes de interface.
- **Chat privado de texto:** duas contas, persistência, autorização, idempotência e bloqueios.
- **Grupos privados de texto:** criação, convites com aceite explícito, membros, mensagens idempotentes, paginação, saída e exclusão com cascata. A interface Android permite essas ações.
- **Denúncias e moderação básica:** registro de usuários, posts ou mensagens de grupos; fila de revisão e alteração de status exigem atribuição de moderador diretamente no banco. Contas comuns recebem 403.
- **Privacidade básica:** exportação da própria conta com `Cache-Control: no-store`, consentimento de marketing, exclusão irreversível confirmada com senha e invalidação das sessões; Android permite escolher local para salvar o JSON pelo seletor do sistema.
- **Resiliência:** rascunhos após rotação, respostas reais da API, navegação dos menus roláveis e builds sem warnings.

## O que ainda impede homologar o produto inteiro

**Páginas ainda indisponíveis:** Stories, Reels, salas de voz, lives, chamadas, presentes, carteira e Seven VIP. O núcleo de **Grupos** está testado, mas o requisito original também inclui grupos VIP, que dependem de entitlements verificados.

**Integrações ainda pendentes:** armazenamento escalável de imagens e vídeo com permissões de upload, RTC real e infra de mídia (incluindo TURN/SFU conforme necessário), pagamentos e resgate/assinatura com provedor legítimo, moderação operacional completa e adequação LGPD com textos jurídicos, políticas de retenção e direitos verificáveis.

**Páginas básicas** possuem cobertura real do núcleo de texto, registrada como `partial_verification` no manifesto, mas continuam `pending` até a validação completa do escopo original. A certificação atual permanece **6 homologadas / 22 pendentes**, em 28 requisitos obrigatórios. Não forçar statuses para produzir release.

## Warns e infraestrutura

Os três pipelines terminam com `success`, e Maven/Gradle retornam **zero warnings de build**. A ferramenta externa Android Emulator ainda emite algumas mensagens `WARNING` durante boot/teardown (Quickboot, X11, memória, netsim); elas não são ocultadas, nem são interpretadas como advertências de compilação do aplicativo. O objetivo adicional de zero mensagens `WARNING` em absolutamente todos os logs continua pendente da correção na toolchain externa.

## Garantias de integração
Tudo na [PR #10](https://github.com/gabriell211/seven-chat/pull/10). Não foi criada PR paralela, nem feita alteração no Neon de produção, nem liberada release. O gate `python3 scripts/release_gate.py` **deve continuar reprovando** até todos os requisitos terem evidência final.


## Núcleo VIP verificado separadamente — migração V5

A migração `V5__vip_verified_entitlements.sql` introduz concessões com origem controlada, prazo de expiração e revogação. A aplicação Android pode consultar somente `GET /api/v1/vip/me`; **não existe endpoint público capaz de criar uma assinatura ou ativar o benefício**. Grupos do tipo `vipOnly=true` exigem uma concessão válida para criação, aceite de convite, leitura e envio de mensagens. O proprietário pode excluir o grupo e um participante pode sair mesmo após perder o benefício.

O teste `VipEntitlementIntegrationTest` usa PostgreSQL real e confirma que concessões ausentes, expiradas ou revogadas não concedem acesso; um grupo normal não é bloqueado por isso. A evidência da camada Java é o [run 41339583396](https://github.com/gabriell211/seven-chat/actions/runs/41339583396), com **33 testes aprovados e zero warnings de build**.

O aplicativo também recebeu tela de status VIP e criação condicionada de grupo exclusivo. A homologação completa da interface e dos testes de emulador precisa ser validada na revisão atual. **A certificação de compra/assinatura permanece pendente:** integrar Google Play Billing e App Store, conferir recibos diretamente com as plataformas, lidar com renovação, cancelamento, reembolso e fraude, e somente então provisionar benefícios pela camada confiável. Nenhuma assinatura de produção foi criada ou cobrada.

**Total de certificações permanece em 6/28**. Os itens `vip` e `purchase-entitlement` possuem evidência parcial no manifesto e não podem ser marcados como homologados antes da integração de cobrança real.

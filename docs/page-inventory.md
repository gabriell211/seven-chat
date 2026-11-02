# Inventário obrigatório de páginas — Seven Chat Java

**Estado em 31/10/2026.** Esta lista é a referência de cobertura. Nenhuma página deve desaparecer silenciosamente do menu e nenhum módulo incompleto deve exibir usuários, salas, assinaturas, presentes, saldos ou pagamentos fictícios.

## Páginas Android com integração funcional na API (não homologadas em APK ainda)

| Página | Fonte real | Ação |
| --- | --- | --- |
| Configurar servidor | URL HTTPS fornecida pelo operador | Persistir URL, revogar sessão anterior ao trocar |
| Cadastro / Login | `/auth/register`, `/auth/login` | Criar conta, autenticar |
| Retomar sessão | `/auth/me` | Validar token armazenado com Android Keystore |
| Feed | `/posts` | Paginar e abrir posts/contas |
| Nova publicação | `POST /posts` | Salvar texto no PostgreSQL com ID de mutação |
| Salvos | `/posts/saved` | Ver publicações marcadas na conta |
| Explorar | `/users?query=` | Buscar contas persistidas |
| Perfil de usuário | `/users/{handle}` | Seguir, deixar de seguir, bloquear e abrir conversa |
| Meu perfil | `/auth/me`, `/users/{handle}`, `/users/me` | Editar nome e biografia |
| Seguidores / Seguindo | `/users/{id}/followers`, `/users/{id}/following` | Listar relações reais |
| Publicação / comentários | `/posts/{id}/comments` | Ler e publicar comentário |
| Conversas | `/conversations` | Abrir chat de contatos reais |
| Conversa 1:1 | `/conversations/{id}/messages` | Ler, enviar texto e atualizar manualmente |
| Notificações | `/notifications` | Consultar eventos, marcar como lidos |
| Bloqueados | `/users/me/blocks` | Consultar e remover bloqueio |
| Configurações | armazenamento seguro + `/auth/logout` | Trocar URL, sair, abrir dados locais antigos |

Estas telas usam dados da API, e **não** fixtures no runtime Android. A interface ainda precisa de validação visual, acessibilidade, testes reais em dois dispositivos e compilação pelo CI.

## Páginas visíveis, porém bloqueadas até homologação

| Página | Dependência real, não simulada |
| --- | --- |
| Stories | Upload, armazenamento, expiração, privacidade e moderação |
| Reels | Pipeline de transcodificação e player |
| Grupos | Autorização, membros, convites, moderação e mensagens |
| Salas de voz | Serviço RTC real com moderação |
| Lives | Serviço RTC real, participantes, reconexão e bitrate |
| Chamadas | Serviço RTC, permissões, histórico e controle de acesso |
| Presentes | Catálogo, carteira/ledger, antifraude e compras verificadas |
| Carteira | Transações contábeis auditáveis e saldo consistente |
| Seven VIP | Assinaturas verificadas no backend, benefícios e renovação |

As páginas acima **não geram conteúdo inventado**: consultam `GET /api/v1/features` e mostram indisponibilidade enquanto o servidor declara `false`.

## Outras páginas e funcionalidades do escopo profissional — pendentes

- Recuperação/verificação de e-mail, gerenciamento de dispositivos e segundo fator.
- Fotos e banners de perfil, edição de mídia, upload e migração consentida das publicações locais.
- Solicitações de amizade/seguimento para conta privada, listas de restrições e política de visibilidade.
- Denúncias, suporte, bloqueio/moderação de comentários, administração e recursos para adolescentes.
- Mensagens com anexos, reações, mídia efêmera, grupos, presença, entrega/leitura, notificações push.
- Stories, destaques, reels, tendências, busca global, algoritmo de recomendação, hashtags e hashtags salvas.
- Chamadas, salas de voz, lives, convidados, batalhas, presentes, rankings e comunidades.
- VIP, molduras, GIF de perfil, assinaturas da loja, recibos, cancelamentos e reembolsos.
- LGPD: exportação, exclusão e retenção dos dados, consentimento, auditoria e política de privacidade.
- Centro de ajuda, configurações avançadas, idioma, acessibilidade, painel administrativo e creator studio.

## Gate técnico

- `scripts/check_pages.py` falha quando menu, rotas, backend ou gate de funcionalidades ficam inconsistentes.
- `backend/src/test` testa respostas HTTP, permissões e tabelas sociais.
- CI Maven/Gradle precisa rodar com sucesso antes de merge ou release.
- Nenhum registro real deve ser carregado a partir de dados criados artificialmente no dispositivo.
- O banco local antigo é preservado; importação para o servidor exige consentimento explícito e deduplicação.

Bloqueios de infraestrutura e compliance: [issue #11](https://github.com/gabriell211/seven-chat/issues/11), [PR #10](https://github.com/gabriell211/seven-chat/pull/10).

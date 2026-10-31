# Seven Chat — homologação funcional (31/10/2026)

## Regra de aceite

Nenhum requisito é certificado apenas porque uma tela existe ou porque compilou. Toda aprovação exige execução real com banco PostgreSQL, status do CI `success`, relatório de testes e ausência de warnings nos **builds**. O `release-certification.json` é o bloqueio de release; não marque todos os itens como aprovados enquanto houver funcionalidades indisponíveis. Mock de usuário, pagamentos fictícios e dados falsos na aplicação não são evidências.

## Evidências observadas

- Java 21 + PostgreSQL 17, [CI 41240374286](https://github.com/gabriell211/seven-chat/actions/runs/41240374286): **22 testes aprovados**, zero falhas, zero warnings de build.
- Android Java, [CI 41240374262](https://github.com/gabriell211/seven-chat/actions/runs/41240374262): compilação APK e testes unitários aprovados, zero warnings de build.
- Android emulador com API Java e PostgreSQL reais, [CI 41240831322](https://github.com/gabriell211/seven-chat/actions/runs/41240831322): **primeira suíte instrumentada aprovada**. Testes usam duas contas criadas no banco de testes e exercitam `SevenApiClient` e Android Keystore, sem servidor público.
- A **homologação visual das páginas** é ampliada em `app/src/androidTest/java/com/seven/chat/RealPagesInstrumentationTest.java`. A aprovação dessa suíte no commit corrente ainda precisa ser comprovada.

## Matriz de funcionalidades

| Função | Backend PostgreSQL | Android | Critério para declarar homologada |
| --- | --- | --- | --- |
| Cadastro e login | Testado por API HTTP real | Teste de cliente passou | Validar também interface real de cadastro/login e fluxos de recuperação/verificação de e-mail |
| Feed e publicações | Testado, com idempotência e paginação | Teste de rede passou; UI sob validação | Renderização, publicação pela UI e paginação em dispositivo |
| Busca de pessoas | Testada contra banco | UI sob validação | Resultados reais, seleção de perfil, erros e acesso |
| Perfis e edição | Testados contra banco | UI sob validação | Perfil próprio/alheio e alteração persistida pela tela |
| Seguir/deixar de seguir | Testado | Teste de rede passou; UI sob validação | Ação real por perfil e atualização de contadores |
| Bloquear/desbloquear | Testado com autorização | Teste de rede passou | Impedir feed/DM de contas bloqueadas, manter restrições após reload |
| Curtidas e salvos | Testados no PostgreSQL | Teste de rede passou; UI sob validação | Estado reproduzível após reinicialização |
| Comentários | Testados | Teste de rede passou | Criar/listar/excluir e validar permissão do autor |
| Chat privado de texto | Testado (idempotência e isolamento) | Teste de rede passou; UI sob validação | Envio, leitura, duas contas e rotação |
| Notificações | Testadas | Teste de rede passou; UI sob validação | Renderizar eventos reais e marcar como lido |
| Configurações e sessão | Logout e revogação testados | Sessão cifrada e revogação testadas | Logout pela UI e restauração de estado |
| Stories, Reels, Grupos | **Não implementados** | Telas explicitamente bloqueadas | Backend, mídia, interfaces e testes reais |
| Salas de voz, lives, chamadas | **Não implementadas** | Telas explicitamente bloqueadas | RTC real, presença, permissões de microfone/câmera e testes multiusuário |
| Presentes, carteira e VIP | **Não implementados** | Telas explicitamente bloqueadas | Catálogo real, antifraude, entitlements, pagamentos e testes com provedor |
| LGPD/moderação e mídia | **Não homologados** | Não homologados | Política, consentimento, upload seguro, denúncia, exclusão/exportação de dados |

## Sem hospedagem

A suíte do workflow `.github/workflows/android-real-e2e.yml` sobe **PostgreSQL 17 + Java Spring Boot + emulador Android** em um runner temporário do GitHub. O Android se conecta à API pelo IP especial de emulador `10.0.2.2:8080`. Não precisa de Railway, Render ou qualquer backend publicado.

## Alertas

- Existem **17 páginas obrigatórias e 11 integrações** no manifesto de certificação. A lista acima agrupa requisitos, não substitui a verificação de cada item.
- O workflow instrumental já passou uma vez, mas o CI do **emulador pode registrar mensagens internas do SDK Android** fora do log de compilação. Não confunda `zero warnings de Gradle/Maven` com `zero warnings de toda ferramenta externa`. Devem ser investigados separadamente, nunca escondidos para gerar aprovação.
- A PR #10 continua em rascunho. **Não fazer merge da API incompleta nem publicar release enquanto o gate reprovar.**

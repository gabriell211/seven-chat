# Seven Chat — homologação sem hospedagem

**Status:** preparação automatizada disponível, **não homologado para produção**. A PR #10 permanece em rascunho. Não publicar APK ou mesclar a API enquanto as validações não passarem com evidência real.

## Ambientes isolados

| Verificação | Banco/serviço usado | Como executar | Situação |
| --- | --- | --- | --- |
| DDL V1–V3 | Branch Neon \`seven-java-homologation-20261031\` | Execução SQL diretamente no Neon | Esquema validado; histórico Flyway **não** criado |
| Java, validação, autenticação, feed e ACL | PostgreSQL 17 **limpo** | \`mvn -B -ntp -f backend/pom.xml clean verify\` | Testes implementados, CI pendente |
| HTTP sem MockMvc | Backend iniciado pelo \`@SpringBootTest(RANDOM_PORT)\` + PostgreSQL | Incluído no comando Maven acima | Testes implementados, execução pendente |
| Android unitário e build | Android SDK 35 + Gradle 8.9 / JDK 17+ | \`gradle --no-daemon testDebugUnitTest assembleDebug\` | CI pendente |
| Android realmente chamando Java | Emulador Android 35, API em \`10.0.2.2:8080\`, PostgreSQL 17 no job | Action **Seven Chat - Android E2E com API local**, manual | Pronto para executar, não certificado |
| 17 páginas, 11 integrações | Inventário e relatórios | \`python3 scripts/release_gate.py\` | **REPROVA** enquanto algum item estiver pendente |
| Google/telefone, e-mail, mídia, moderação, RTC, VIP, pagamentos, LGPD, desempenho | Serviços reais e dispositivos | Testes adicionais de infraestrutura e fornecedores | Ainda faltando implementação e homologação |

## Como executar sem Docker e sem hospedagem

Use PostgreSQL 17 local com um banco **exclusivo de testes e inicialmente vazio**. O CI já cria esse banco automaticamente. Nunca execute esses testes sobre o Neon de produção.

Exemplo de configuração no PowerShell:

\`\`\`powershell
$env:JDBC_DATABASE_URL = "jdbc:postgresql://localhost:5432/seven_chat_ci"
$env:DB_USER = "seven_ci"
$env:DB_PASSWORD = "<senha-do-seu-banco-de-testes>"
mvn -B -ntp -f backend/pom.xml clean verify
python scripts/check_brand.py
python scripts/check_pages.py
gradle --no-daemon testDebugUnitTest assembleDebug
\`\`\`

A migração precisa começar no banco vazio para o Flyway registrar os checksums das versões **V1, V2 e V3**. **Não** configure \`baselineOnMigrate=true\` só para ignorar migrações já aplicadas manualmente na branch Neon de homologação.

A suíte Java de verdade executa \`RealHttpEndToEndTest\` por HTTP em uma porta aleatória, com duas contas temporárias criadas no banco isolado; testa cadastro, feed, envio de mensagem e revogação de sessão. O \`AuthThrottleIntegrationTest\` valida o bloqueio de tentativas por PostgreSQL.

Para teste Android também sem hospedagem, abra **Actions → Seven Chat - Android E2E com API local → Run workflow**, selecionando a branch \`feat/java-api-p0-20261031\`. O job executa:
1. Banco PostgreSQL 17 temporário no GitHub Actions.
2. API Java 21 em \`127.0.0.1:8080\`, acessível no emulador como \`10.0.2.2:8080\`.
3. Teste instrumentado \`RealBackendInstrumentationTest\` com Android Keystore e HTTP real.
4. Relatório de teste Android e log do servidor anexados como artifact.

A liberação de HTTP sem TLS existe **somente no Manifest da variante debug**, para conectar o emulador ao servidor localhost. Em produção, a API exige HTTPS.

## Condições obrigatórias antes da release

- Workflows GitHub Actions com jobs que **realmente executaram as etapas** e terminaram com sucesso; falhas com \`steps=null\` não provam nada sobre o código.
- Relatórios Surefire e Android instrumentation preservados; falhas investigadas e corrigidas.
- Android testado em ao menos um aparelho físico, incluindo rotação, reinício, modo offline e permissões.
- E2E em ambiente público com banco e API isolados, HTTPS/TLS e autenticação/recuperação reais.
- Todas as páginas e integrações funcionais, sem telas falsas, funcionalidades marcadas indisponíveis ou dados de demonstração em produção.
- Proteção de abuso, privacidade/LGPD, moderação, canais de reporte, políticas de pagamento/VIP e validação de lojas.
- Manifest \`release-certification.json\` preenchido **somente** após evidências verificáveis, e \`scripts/release_gate.py\` aprovado. Até lá, **não há release**.

## GitHub Actions ainda bloqueado

Quando um job GitHub Actions termina em \`failure\` com \`steps=null\`, o runner nem chegou a executar as etapas. Verifique em Settings → Actions / billing/limite de minutos e permissões do repositório. Isso não deve ser interpretado como erro de Java/Gradle sem logs, e não autoriza marcar testes como aprovados.

**Não é necessária uma hospedagem pública para iniciar nenhuma das três suítes técnicas acima.** A hospedagem entra depois, para validação real de produção.

# Seven Chat Java API (estágio P0)

API Spring Boot **4.1.2** + Java 21 + PostgreSQL, independente do app Android. É a primeira etapa do backend real; não substitui ainda serviços completos de mensagens, live, assinaturas ou a experiência multiusuário do aplicativo.

## API disponível

| Método | Caminho | Credencial | Resultado |
| --- | --- | --- | --- |
| GET | `/api/v1/health` | Não | Status HTTP da aplicação |
| POST | `/api/v1/auth/register` | Não | Cria conta, emite token de 7 dias |
| POST | `/api/v1/auth/login` | Não | Valida senha e emite token |
| GET | `/api/v1/auth/me` | Bearer | Perfil público do próprio usuário |
| POST | `/api/v1/auth/logout` | Bearer | Revoga o token atual |
| GET | `/api/v1/posts?before=&limit=20` | Bearer | Feed de texto entre usuários |
| POST | `/api/v1/posts` | Bearer | Post de texto com idempotência por `clientMutationId` |

Cadastro:
```json
{"email":"pessoa@example.com","handle":"pessoa123","displayName":"Pessoa Seven","password":"uma-senha-longa-e-forte"}
```

Login:
```json
{"email":"pessoa@example.com","password":"uma-senha-longa-e-forte"}
```

Publicação:
```json
{"clientMutationId":"1ac40a2d-2997-47d4-b083-c0637bfb1d1d","body":"Olá Seven Chat!"}
```

Cada cliente deve produzir um novo `clientMutationId` UUID por ação de publicar e **reutilizá-lo ao repetir a mesma solicitação**, prevenindo duplicação. Na próxima fase, serão adicionados métodos completos de upload, interação e sincronização no Android.

## Execução local

Requer **Java 21**, **Maven 3.9+** e PostgreSQL acessível.

Configure em variáveis de ambiente:

```text
JDBC_DATABASE_URL=jdbc:postgresql://localhost:5432/seven_chat
DB_USER=seven_chat
DB_PASSWORD=<senha-do-usuario-no-banco>
PORT=8080
```

Crie a base e usuário de banco previamente, com permissão para executar a migração Flyway. Para conexão com Neon, use a URL **JDBC PostgreSQL** e configure SSL na string JDBC quando exigido pela plataforma.

```bash
mvn -f backend/pom.xml -B -ntp clean verify
mvn -f backend/pom.xml spring-boot:run
```

Os testes automatizados usam **PostgreSQL real**, provisionado pelo workflow de API no GitHub Actions. As migrações Flyway V1, V2 e V3 criam contas, sessões, posts, relações sociais, mensagens, notificações e contadores de tentativas de autenticação. A branch de homologação `br-steep-sunset-b4mr8l1b` foi usada para validar manualmente o esquema, e **não** deve receber automaticamente o Flyway inicial como se estivesse vazia: as migrações manuais não registraram histórico de checksum Flyway.

## Segurança entregue

- BCrypt para senha; registro retorna dados públicos, nunca o hash.
- Tokens opacos aleatórios de 256 bits; armazenados como SHA-256 no banco.
- Login e posts exigem token válido, salvo endpoints públicos de cadastro/login.
- Tokens expiram em 7 dias e são revogáveis.
- Queries JDBC parametrizadas, sem SQL montado com conteúdo de usuários.
- Paginação por cursor ID, tamanho máximo 30, limites de validação de payload.
- Handles restritos e nomes administrativos reservados.
- IDs de mutação únicos por conta para evitar duplicação de posts em retries sequenciais.

## Bloqueios antes de produção pública

- **Verificação de e-mail e recuperação de senha ainda não implementadas.**
- Limites básicos distribuídos de cadastro/login **implementados em PostgreSQL** (429 após limite), mas ainda sem testes de carga, redes de proxy validadas e política de proteção contra ataque distribuído em vários endereços IP.
- Moderação, denúncia, exclusão/exportação LGPD e controles de idade ainda não implementados.
- Segurança de transporte HTTPS no proxy de produção ainda precisa ser configurada.
- Idempotência concorrente e integração real Android/API ainda precisam de teste ponta a ponta.
- Mensagens privadas de **texto** existem na API; mensagens com mídia, push, presença, chamadas, compras, assinatura VIP, upload e lives ainda não foram homologadas.

Não disponibilize cadastro aberto para a internet sem fechar esses itens e validar TLS, logs de auditoria e proteção contra abuso. **Nenhum segredo deve ser incluído no repositório.**

## Gate de qualidade

O workflow `Seven Chat Java API` executa Maven `clean verify` e publica relatórios dos testes. O backend só deve ser mesclado depois de **CI verde**; o app Android possui CI separado.

A issue #9 acompanha os itens P0 faltantes.

## Hospedagem portátil

A API tem `backend/Dockerfile` com Java 21 e execução sem root. Para Android apontar automaticamente para uma API HTTPS homologada, use `gradle -PsevenApiUrl=https://api.exemplo-real.com assembleRelease`. Esse endereço é um exemplo de sintaxe, **não um endpoint existente**. Nunca adicione senhas ou credenciais do Neon no app. O URL deve apontar para serviço efetivamente implantado e testado. Sem `sevenApiUrl`, a interface solicita configuração manual do servidor.

O Google Cloud Run oferece franquia gratuita mensal, mas **precisa de projeto Cloud com faturamento habilitado** e não garante custo zero sob qualquer carga. Consulte `docs/hosting.md`. Railway e Render estão fora do desenho de hospedagem.

Nenhuma release foi liberada. Todos os requisitos obrigatórios constam em `release-certification.json` e são bloqueados por `scripts/release_gate.py` caso não estejam homologados.


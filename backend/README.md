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

O teste automatizado usa H2 no modo PostgreSQL; a produção usa o driver PostgreSQL. A migração `V1__accounts_sessions_posts.sql` cria contas, sessões revogáveis e posts de texto com índices.

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
- **Rate limiting distribuído/anti-brute-force ainda não implementado.**
- Moderação, denúncia, exclusão/exportação LGPD e controles de idade ainda não implementados.
- Segurança de transporte HTTPS no proxy de produção ainda precisa ser configurada.
- Idempotência concorrente e integração real Android/API ainda precisam de teste ponta a ponta.
- Assinaturas VIP, compras, imagens e chat não existem nesta API.

Não disponibilize cadastro aberto para a internet sem fechar esses itens e validar TLS, logs de auditoria e proteção contra abuso. **Nenhum segredo deve ser incluído no repositório.**

## Gate de qualidade

O workflow `Seven Chat Java API` executa Maven `clean verify` e publica relatórios dos testes. O backend só deve ser mesclado depois de **CI verde**; o app Android possui CI separado.

A issue #9 acompanha os itens P0 faltantes.

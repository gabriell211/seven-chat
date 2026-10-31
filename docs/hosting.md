# Seven Chat Java — hospedagem sem créditos temporários

O backend Java 21 / Spring Boot foi preparado para execução em contêiner. O `backend/Dockerfile` usa compilação em duas etapas e executa a API como usuário sem privilégios. Isso **não significa que a aplicação foi compilada ou implantada**. O CI deve aprovar os testes antes de qualquer deploy.

## Infraestrutura

- Banco: projeto Neon **Seven chat** (PostgreSQL), mantendo uma branch separada para homologação. A branch `seven-java-homologation-20261031` teve o esquema das migrações SQL verificado diretamente no PostgreSQL.
- API: contêiner Java 21 que pode ser hospedado em Cloud Run, VM ou provedor compatível com Docker.
- Não usar Railway ou serviços que consumam créditos de teste que expiram.
- A hospedagem, inclusive a gratuita, não tem garantia de disponibilidade eterna. Backups externos e monitoramento são obrigatórios.

### Opção sem prazo promocional: Google Cloud Run

O Cloud Run possui franquia mensal gratuita, mas **exige conta Google Cloud com faturamento habilitado** e pode gerar cobrança por uso além da franquia, rede, build ou registro de imagens. `--min-instances=0` evita manter máquina cobrada sem tráfego, porém ocasiona *cold starts* e não serve como garantia de instância sempre ligada.

Documentação: https://cloud.google.com/run/pricing e https://cloud.google.com/run/docs/deploying-source-code .

Pré-requisitos:
1. Um projeto Google Cloud autorizado, billing ativo, Cloud Run, Cloud Build, Artifact Registry e Secret Manager.
2. Credenciais Neon de **uma role específica da API**, protegidas no Secret Manager e nunca presentes no repositório.
3. CI de testes Java/Android aprovado e publicação autorizada.
4. O backend deve conectar ao banco por PostgreSQL JDBC com TLS. Não reutilize a senha do banco em URLs públicos ou aplicativos.

Exemplo de montagem **somente para homologação após aprovação do CI**:

```bash
# Entre na pasta backend/ no repositório clonado:
cd backend
gcloud run deploy seven-chat-api \
  --source . \
  --region us-central1 \
  --min-instances 0 \
  --max-instances 1 \
  --memory 512Mi \
  --cpu 1 \
  --allow-unauthenticated
```

O comando acima não injeta credenciais: a API não ficará funcional até vincular `JDBC_DATABASE_URL`, `DB_USER` e `DB_PASSWORD` a valores protegidos pelo Secret Manager. Para conferir saúde: `GET /api/v1/health`, que consulta o banco. Não exponha o endpoint à internet antes de configurar antifraude, limites de requisição e controles de abuso.

### Neon — observação de migração

O esquema foi criado diretamente na branch de homologação para validar SQL. **Não há evidência de que o histórico Flyway tenha sido inicializado nessa branch**. Para executar um backend com Flyway `V1` e `V2` automaticamente, use um banco/branch **vazio e dedicado**. Não habilite `baselineOnMigrate` automaticamente para mascarar schemas preexistentes.

## Bloqueios

A [PR #10](https://github.com/gabriell211/seven-chat/pull/10) continua em rascunho e [issue #11](https://github.com/gabriell211/seven-chat/issues/11) acompanha o GitHub Actions. Módulos em tempo real, voz/vídeo, mídia, VIP e assinaturas continuam sem homologação.

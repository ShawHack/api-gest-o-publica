# Plano mestre — API-SEMIT

Documento vivo de evolução técnica: auditoria, operação, testes automáticos e roadmaps.

**Status da implementação (início):** Fase 1 parcialmente iniciada — ver seção [Progresso](#progresso).

## Progresso

| Item | Status |
|------|--------|
| Remoção log `JWT_SECRET` | Concluído |
| `POST /medicamentos/refresh` só admin + rate limit | Concluído |
| Erros 500 genéricos em produção | Concluído |
| Dockerfile backend (`USER node`, `node index.js`) | Concluído |
| Jest + testes integração (health, login, IDOR, sepultados, pets, medicamentos, OpenAPI, refresh, votação) | Concluído (meta ≥40% cobertura) |
| CI GitHub backend + Gov pytest | Concluído |
| Mongo sem porta pública no compose | Concluído |
| `GOVCIDADAO_JWT_SECRET` obrigatório no compose | Concluído |
| `server.js` exportável para testes | Concluído |
| Runbook + este plano | Concluído |
| Backup cron automático | Concluído (`scripts/backup-diario.sh` + cron 02:30) |
| Uptime a cada 10 min | Concluído (`scripts/uptime-check.sh` + cron) |
| `RATE_LIMIT_MAX=300` produção | Concluído |
| Rotação secrets (roteiro + gerador) | Concluído (`docs/ROTACAO-SECRETS.md`, `scripts/gerar-novos-secrets.sh`) |
| Rotação secrets em produção | Concluído 2026-06-03 (`ROTACAO-SECRETS.md`) |
| Roteiro restore + verificar-backup | Concluído (`docs/RESTORE-BACKUP.md`) |
| CPF votação → cpfHash (migração automática) | Concluído |
| mongo-sanitize + hpp (Express 5 compat) | Concluído |
| Snapshot pré-Fase 2 (`2026-06-03_14-35-11`) | Concluído — ver `RESTORE-BACKUP-LOG.md` |
| Teste de restore trimestral (execução real) | Concluído 2026-06-03 (`scripts/teste-restore-homologacao.sh`, `RESTORE-BACKUP-LOG.md`) |
| OpenAPI publicado (`/openapi.json`) | Concluído (`scripts/build-openapi.js`, teste Jest) |
| Nginx HSTS + redirect HTTP→HTTPS | Concluído em produção (`nginx/nginx.conf` unificado 80+443; reload 2026-06-03) |
| SSO Gov sem token na URL | Concluído (`GovCidadao/.../stripSensitiveQuery.ts`; memorial WebView sem `?token=`) |
| API porta 5000 só localhost | Concluído (`127.0.0.1:5000:5000` no compose) |
| pytest Gov (auth + ocorrências) | Concluído (`scripts/run-gov-pytest.sh`, `tests/test_occurrences.py`) |
| Refresh token Memorial | Concluído (`/users/refresh`, `auth-refresh.js`, access 15m) |
| Playwright E2E (smoke staging/prod) | Concluído (`e2e/`, `scripts/run-playwright.sh`, workflow nightly) |
| Fase 3 — Mongo rs0 + Redis + filas + métricas | Concluído 2026-06-03 (`docs/FASE3-ESCALA.md`) |
| Fase 4 — LGPD export/delete + retenção audit + Sentry opcional | Concluído (`docs/FASE4-LGPD.md`) |
| Retenção audit logs (cron domingo 03:45) | Concluído (`install-fase4-ops.sh`, `audit-retention.log`) |
| Alertas uptime por e-mail (SMTP institucional) | Concluído (`uptime-check.sh` + `send-uptime-alert.js`) |
| GovCidadao LGPD (`/lgpd/me/export`, `/lgpd/me/delete`) | Concluído (`docs/GOV-LGPD.md`) |

## Roadmap

### Fase 1 — Crítico (0–6 semanas)

- Secrets: rotacionar `JWT_SECRET`, `GOVCIDADAO_JWT_SECRET`, API keys em produção.
- Backup: cron diário + teste de restore trimestral (`backup_completo.sh`).
- Monitoramento: uptime em `/health` e `/readyz`.
- `RATE_LIMIT_MAX` em produção (ex.: 300).
- Pseudonimizar CPF em `VotingServidor`.

### Fase 2 — Estrutural (6–14 semanas) — concluída

- `mongo-sanitize`, `hpp`, refresh token Memorial, paginação pets/sepultados.
- OpenAPI, Jest ≥40% (auth/helpers), Playwright smoke (`docs/PLAYWRIGHT-E2E.md`).
- SSO sem token na URL; nginx HTTP→HTTPS + HSTS.

### Fase 3 — Escala (3–6 meses) — em produção (2026-06-03)

- Mongo replica set `rs0` — **ativo** (`scripts/mongo-migrate-to-replica-set.sh`).
- Redis + workers `email-worker` / `job-worker` — **ativo**.
- Filas e-mail (Redis) e refresh medicamentos enfileirado — **ativo**.
- Prometheus/Grafana — perfil `monitoring` (`docs/FASE3-ESCALA.md`).
- k6 — `scripts/run-k6.sh`.

### Fase 4 — LGPD e governança (contínuo)

- Exportar/excluir dados do titular; retenção audit logs; Sentry.

## Testes automáticos

### Como rodar

```bash
# Backend
cd backend && npm ci && npm test
cd backend && npm run test:coverage   # gate ≥40% (jest.config.js)

# GovCidadao
cd GovCidadao && pip install -r requirements.txt -r requirements-dev.txt
JWT_SECRET=test pytest -q

# Verificar logs de segredos
bash scripts/ci-check-secret-logs.sh
```

### CI (opcional — só se usar Git/GitHub)

- `.github/workflows/ci-backend.yml` — Jest, audit npm, checagem de logs.
- `.github/workflows/ci-govcidadao.yml` — pytest.

Sem Git: rode `npm test` e `bash scripts/ci-check-secret-logs.sh` manualmente antes do deploy.

### Repositório canônico

Ver [FONTE-CANONICA.md](./FONTE-CANONICA.md) — produção em `/home/semit/Documentos/api-semit`, não em `full/project/`.

### Próximos testes (Fase 2)

- Supertest: login, IDOR users, sepultados públicos — **feito** (`__tests__/integration/auth-login-idor.test.js`, `sepultados-public.test.js`).
- pytest: auth e occurrences Gov — **feito** (`test_auth_token.py`, `test_occurrences.py`, `run-gov-pytest.sh`).
- Playwright nightly em staging — **feito** (`docs/PLAYWRIGHT-E2E.md`, `.github/workflows/e2e-nightly.yml`).
- Paginação `GET /pets` — **feito**. `/sepultados` já tinha paginação.
- pytest Gov JWT — **feito** (`GovCidadao/tests/test_auth_token.py`).
- OpenAPI, HSTS, SSO — **feito** (esta rodada).
- Cobertura Jest ≥40% (módulos auth/helpers/votação) — **feito** (`npm run test:coverage`, 68 testes).

## Operação

Runbook completo: [RUNBOOK-INCIDENTES.md](./RUNBOOK-INCIDENTES.md)

| Severidade | Quando usar |
|------------|-------------|
| S1 | Portal total fora |
| S2 | Um módulo crítico fora |
| S3 | SMTP, medicamentos, UI auxiliar |

## Backup antes de mudanças grandes

Sempre que for rotacionar secrets, alterar schema Mongo ou deploy arriscado:

```bash
bash /home/semit/Documentos/api-semit/backup_completo.sh
bash /home/semit/Documentos/api-semit/scripts/verificar-backup.sh
```

Cron diário (se instalado): `scripts/backup-diario.sh` às 02:30. Retenção padrão: 14 dias.

## Deploy / Compose

1. Copiar `.env.example` → `.env` na raiz com `GOVCIDADAO_JWT_SECRET` forte.
2. Configurar `backend/.env` com `JWT_SECRET` forte e `RATE_LIMIT_MAX=300` em produção.
3. `docker compose up -d --build`
4. Validar: `curl https://api.garca.sp.gov.br/readyz`

**Atenção:** Mongo não expõe mais porta `27019` no host por padrão. Para debug local, descomente a porta em `docker-compose.yml` (`127.0.0.1:27019:27017`).

## Desenvolvimento local

```bash
cd backend
npm run dev    # nodemon
npm start      # produção local
npm test       # testes
```

## Riscos abertos (prioridade)

| Risco | Status |
|-------|--------|
| Secrets fracos / não rotacionados | Mitigado 2026-06-03 (`ROTACAO-SECRETS.md`) |
| Restore nunca testado | Mitigado 2026-06-03 (`teste-restore-homologacao.sh`) |
| API exposta em `:5000` no host | Mitigado — bind `127.0.0.1` |
| Uptime só local (`uptime-check.sh`) | Mitigado — cron + e-mail em falha (`MONITOR-EXTERNO.md`) |
| N+1 consultas adoção (Garça Pet) | Aberto — ver `PLANO_IMPLEMENTACAO_GARCA_PET.md` |
| Push FCM incompleto | Aberto |

**Stack gratuita adotada:** cron + SMTP, Prometheus/Grafana local, Sentry free (backend), LGPD nas APIs — sem UptimeRobot/pagos.

| Fase 6 — Retenção audit por tipo + Grafana forense | Concluído (`docs/FASE6-AUDITORIA-OPS.md`) |

| Módulo castração (campanhas + solicitações) | Planejado (`docs/PLANO-CASTRACAO-CAMPANHAS.md`) |

**Próximo passo (tudo free):** UI no frontend Gov para exportar/excluir; opcional Telegram webhook; dívidas Garça Pet (N+1) e FCM; **implementar módulo castração** após decisões §14 do plano.

## Referências

- Auditoria técnica (chat/documentação interna)
- `backup_completo.sh`, `rebuild.sh`
- `backend/public/routes.json`

# Fase 4 — LGPD (API SEMIT)

## Rotas (JWT obrigatório)

| Método | Caminho | Quem | Descrição |
|--------|---------|------|-----------|
| GET | `/lgpd/me/export` ou `/api/lgpd/me/export` | Titular | Exporta JSON com perfil, pets, denúncias, árvores, adoções, trilha de auditoria (últimos 500 eventos como ator) |
| POST | `/lgpd/me/delete` | Titular | Anonimiza conta após `confirm: "EXCLUIR"` e senha atual |
| GET | `/lgpd/users/:userId/export` | Admin | Exporta dados de um titular |
| POST | `/lgpd/users/:userId/delete` | Admin | Anonimiza titular (`confirm: "EXCLUIR"`) |

Rate limit: 10 requisições / 15 min por rota LGPD.

### Exemplo — exportar (titular)

```bash
TOKEN="..."   # JWT do Memorial
curl -sS -H "Authorization: Bearer $TOKEN" \
  https://api.garca.sp.gov.br/api/lgpd/me/export \
  -o meus-dados.json
```

### Exemplo — exclusão (titular)

```bash
curl -sS -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"confirm":"EXCLUIR","password":"sua-senha-atual"}' \
  https://api.garca.sp.gov.br/api/lgpd/me/delete
```

## Comportamento da exclusão

- E-mail substituído por `excluido+<id>@anon.semit.local`; senha aleatória; PII removida do perfil.
- Pets, adoções, denúncias e árvores do titular são **removidos**.
- Sepultados vinculados: nome do titular no registro vira "Titular removido (LGPD)" (memorial público pode permanecer).
- Audit logs do ator: e-mail e metadados redigidos; evento `lgpd.subject_erase` registrado.

## Retenção de audit logs

Retenção **por tipo** (Fase 6): SECURITY/LGPD ~5 anos, negados ~2 anos, VIEW ~90 dias, demais 365 dias. Ver `docs/FASE6-AUDITORIA-OPS.md`.

Variável principal: `AUDIT_LOG_RETENTION_DAYS` (padrão **365**, mínimo efetivo 30).

```bash
# Purge manual (container api)
bash scripts/audit-log-retention.sh
```

Cron instalado no host (domingo 03:45):

```bash
bash scripts/install-fase4-ops.sh   # idempotente
```

Log: `~/Documentos/backups-completos/_logs/audit-retention.log`

## Sentry (opcional)

No `backend/.env`:

```env
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.05
```

Sem `SENTRY_DSN`, a API inicia normalmente sem telemetria.

## Testes

```bash
cd backend && npm test -- --testPathPattern=lgpd
```

## Deploy

```bash
cd /home/semit/Documentos/api-semit
docker compose up -d --build api
docker compose exec nginx nginx -s reload
```

Validar: `curl -sS -o /dev/null -w "%{http_code}" https://api.garca.sp.gov.br/readyz` → `200`.

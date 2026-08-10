# Fase 6 — Retenção por tipo + Grafana (stack gratuita)

Ferramentas: **Prometheus** e **Grafana OSS** (open source, sem custo de licença).

## Retenção por tipo de evento

O cron de domingo (`scripts/audit-log-retention.sh`) aplica **tiers** mutuamente exclusivos:

| Tier | Critério | Padrão (dias) | Variável |
|------|----------|---------------|----------|
| security | `eventType: SECURITY` | 1825 (~5 anos) | `AUDIT_LOG_RETENTION_SECURITY_DAYS` |
| lgpd | `module: lgpd` | 1825 | `AUDIT_LOG_RETENTION_LGPD_DAYS` |
| denied | `status: denied` | 730 (~2 anos) | `AUDIT_LOG_RETENTION_DENIED_DAYS` |
| view | `eventType: VIEW` | 90 | `AUDIT_LOG_RETENTION_VIEW_DAYS` |
| default | demais eventos | 365 | `AUDIT_LOG_RETENTION_DAYS` |

Mínimo efetivo por tier: **30 dias**.

### Purge manual

```bash
bash scripts/audit-log-retention.sh
```

## Métricas Prometheus (`GET /metrics`)

Novas séries (cache Mongo 60s):

- `audit_events_24h_total`
- `audit_security_events_24h_total`
- `audit_events_24h_by_module{module="..."}`
- `audit_events_24h_by_status{status="..."}`
- `audit_denied_24h_by_module{module="..."}`

## Grafana (localhost)

```bash
# Defina senha forte no .env da raiz (opcional)
# GRAFANA_ADMIN_PASSWORD=sua-senha

bash scripts/start-monitoring.sh
```

| Serviço | URL |
|---------|-----|
| Prometheus | http://10.15.25.28:9090 (rede interna; target `api-semit` → `/metrics`) |
| Grafana | http://10.15.25.28:3001 (rede interna) |

Saúde do Mongo: métrica `api_mongo_ready` em `/metrics` (não use `/readyz` no Prometheus — retorna JSON).

Dashboard provisionado: **Auditoria forense — API-SEMIT** (pasta API-SEMIT).

> Bind padrão: IP interno `10.15.25.28` (variável `MONITORING_BIND_IP`). Não exposto na internet pública. `127.0.0.1` no navegador do seu PC aponta para o seu computador, não para o servidor.

## Deploy API (métricas + retenção)

```bash
cd /home/semit/Documentos/api-semit
docker compose up -d --build api
```

Validar métricas:

```bash
curl -sS http://127.0.0.1:5000/metrics | grep audit_
```

## Testes

```bash
cd backend && npm test -- --testPathPattern=audit-log-retention
```

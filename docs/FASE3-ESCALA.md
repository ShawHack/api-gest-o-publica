# Fase 3 — Escala (ordem de implementação)

## 1. Mongo replica set ✅

- Compose: `mongod --replSet rs0`
- URI: `?replicaSet=rs0` em `MONGODB_URI` / `MONGO_URI`
- Migração produção: `bash scripts/mongo-migrate-to-replica-set.sh` (após backup)
- Init idempotente: `bash scripts/mongo-init-replica-set.sh`

## 2. Redis ✅

- Serviço `redis` na rede `stack` (sem porta no host)
- `REDIS_URL=redis://redis:6379` no `api` e `email-worker`

## 3. Filas e-mail / PDF ✅ (base)

- E-mail: `helpers/email-queue.js` + `scripts/email-queue-worker.js` + serviço `email-worker`
- PDF (medicamentos): `helpers/job-queue.js` — job `medicamentos:refresh` enfileirado quando `REDIS_URL` definido

## 4. Prometheus / Grafana ✅

- Perfil opcional: `bash scripts/start-monitoring.sh`
- Scrape: `http://api:5000/metrics` (inclui métricas `audit_*` — Fase 6)
- Grafana: `http://127.0.0.1:3001` (somente localhost)
- Dashboard provisionado: **Auditoria forense — API-SEMIT** (`docs/FASE6-AUDITORIA-OPS.md`)

## 5. k6 ✅

```bash
bash scripts/run-k6.sh
```

## Monitor externo (complemento)

Alertas por e-mail em falha: `docs/MONITOR-EXTERNO.md` (cron `uptime-check.sh` a cada 10 min).

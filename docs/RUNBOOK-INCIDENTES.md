# Runbook de incidentes — API-SEMIT

Referência operacional: **evento → sintoma → detecção → RTO → ação**.

## Referência rápida

| Item | Valor |
|------|--------|
| URL | `https://api.garca.sp.gov.br` |
| Compose | `docker compose` na raiz do repositório |
| Containers | `mongo`, `api`, `nginx`, `govcidadao-api`, `govcidadao-frontend`, `certbot` |
| Health | `GET /health` → `{"status":"UP"}` |
| Ready | `GET /readyz` → `ready: true`, `database: connected` |
| Backup | `./backup_completo.sh` |

### Primeiros 5 minutos

```bash
cd ~/Documentos/api-semit
docker compose ps
curl -sS https://api.garca.sp.gov.br/health
curl -sS https://api.garca.sp.gov.br/readyz
docker logs --tail 80 api
docker logs --tail 40 mongo
docker logs --tail 40 nginx
```

## Severidade

| Nível | Critério | SLA resposta |
|-------|----------|--------------|
| **S1** | Portal total fora ou perda de dados | 15 min |
| **S2** | Módulo crítico fora (login, Garça Cidadão, Mongo instável) | 30 min |
| **S3** | Auxiliar (SMTP, medicamentos, UI menor) | Próximo dia útil |

## Matriz de incidentes

| ID | Evento | Sintoma | RTO | Ação |
|----|--------|---------|-----|------|
| I01 | API parada | 502, `/health` falha | 5–15 min | `docker compose restart api` → logs |
| I02 | Mongo parado | `/readyz` 503 | 15–60 min | `restart mongo` → `restart api` → restore se persistir |
| I03 | nginx parado | Tudo fora na 443 | 5–20 min | `docker compose up -d nginx` |
| I04 | GovCidadao down | Só `/garca-cidadao` 502 | 10–30 min | `restart govcidadao-api govcidadao-frontend` |
| I05 | 502 pós-recreate | Intermitente Gov | 5–15 min | Aguardar health → `restart nginx` |
| I06 | Disco cheio | Writes falham | 30 min–4 h | Liberar espaço → backup antes de limpar volumes |
| I07 | TLS expirado | Browser bloqueia HTTPS | 30 min–2 h | `docker logs certbot` → renovar → `restart nginx` |
| I08 | Deploy quebrado | 404 / API erro | 30 min–3 h | Rollback imagem/volume backup |
| I09 | Sobrecarga / abuso | Lentidão, CPU 100% | 15–60 min | Rate limit; bloquear IP; ver `/medicamentos/refresh` |
| I10 | Corrupção Mongo | Dados inconsistentes | 2–8+ h | Parar API → `mongorestore` do backup |
| I11 | Host perdido | Nada responde | 4–24+ h | Novo host + restore completo |
| I12 | SMTP | E-mail não enviado | Parcial | Ver `SMTP_*` em `backend/.env` |
| I13 | PDF medicamentos | Módulo 502 | Parcial | Falha externa; comunicar módulo |

## Procedimento S1

1. Diagnosticar com `/health` e `/readyz`.
2. `docker compose ps` — subir containers `Exit`.
3. Se Mongo não recuperar em 10 min → restore (I10), não apenas restart.
4. Smoke: login, listagem sepultados, uma rota Garça Cidadão.
5. Comunicar stakeholders; registrar horário.
6. `./backup_completo.sh` após estabilizar.

## Procedimento S2

1. Isolar módulo (Memorial vs Garça Cidadão).
2. Restart cirúrgico do container afetado.
3. Smoke do módulo + um vizinho.

## Procedimento S3

1. Confirmar portal principal OK.
2. Ticket interno; banner no módulo se > 4 h.

## Restore (I10)

1. `./backup_completo.sh` se ainda houver serviço parcial.
2. `docker compose stop api govcidadao-api`
3. Restaurar dump em `mongo` (ver documentação do backup).
4. `docker compose up -d` → validar `/readyz`.

## Pós-incidente

- Linha do tempo, causa raiz, RPO/RTO reais, ação preventiva.
- Atualizar este runbook se o procedimento real divergiu.

Ver também: [PLANO-MASTER-API-SEMIT.md](./PLANO-MASTER-API-SEMIT.md)

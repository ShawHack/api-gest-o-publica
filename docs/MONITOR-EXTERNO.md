# Monitoramento e alertas (sem serviço externo pago)

Abordagem adotada: **checagem no próprio servidor** + **e-mail institucional** quando algo falha. Não depende de UptimeRobot nem de plano comercial de terceiros.

## O que roda hoje

| Item | Frequência | Script / log |
|------|------------|--------------|
| Health + containers + disco | A cada **10 min** (cron) | `scripts/uptime-check.sh` |
| Log | Append | `~/Documentos/backups-completos/_logs/uptime-check.log` |
| Alerta e-mail | Só quando há **falha** (ou **recuperação** após falha) | SMTP já em `backend/.env` |
| Cooldown entre e-mails | Padrão **30 min** | `UPTIME_ALERT_COOLDOWN_MIN` |

Cron (já instalado via `install-fase1-ops.sh`):

```text
*/10 * * * * BASE_URL=https://api.garca.sp.gov.br REPO=... scripts/uptime-check.sh
```

## Configurar destinatário do alerta

Edite `backend/.env`:

```env
# Um ou vários e-mails separados por vírgula (SEMIT / plantão)
UPTIME_ALERT_EMAIL_TO=cgp@garca.sp.gov.br,outro@garca.sp.gov.br
```

Se omitir, usa `COMPLIANCE_ALERT_EMAIL_TO` ou, por último, `SMTP_USER`.

Opcional:

```env
UPTIME_ALERT_COOLDOWN_MIN=30
APP_NAME=API SEMIT Garça
```

Reinicie a API **não** é obrigatório para o cron (o script lê o `.env` no container na hora do envio). Se alterar só variáveis lidas pela API em runtime, basta o próximo `docker compose exec api`.

## Teste manual

```bash
# Só checagem (sem forçar falha)
REPO=/home/semit/Documentos/api-semit bash scripts/uptime-check.sh

# Simular envio de alerta (corpo fictício)
echo "Teste de alerta uptime" | docker compose exec -T api node scripts/send-uptime-alert.js down
```

## O que é verificado

- `https://api.garca.sp.gov.br/health` e `/readyz` → HTTP 200
- `http://127.0.0.1:5000/health` (API local)
- Containers Docker: `mongo`, `redis`, `api`, `nginx`
- Disco `/` acima de 85% (configurável com `DISK_WARN`)
- Checagem de segredos em logs no código (`ci-check-secret-logs.sh`)

## Limitação (honesta)

Se o **servidor inteiro** cair (rede, energia, VM off), o cron local **não envia** e-mail — ninguém de fora “bate” na URL. Mitigações possíveis no futuro:

- Segundo servidor ou Zabbix/Nagios da rede da prefeitura
- Webhook Telegram (`UPTIME_ALERT_WEBHOOK_URL` — ainda não implementado; pedir se quiser)

Para a SEMIT, o e-mail no primeiro sintoma (API/container/disco) cobre a maioria dos incidentes operacionais.

## Após incidente

1. `docker compose ps` e logs `api` / `nginx`
2. Se recriou o `api`: `docker compose exec nginx nginx -s reload`
3. Registrar em `RESTORE-BACKUP-LOG.md` se houver restore

Ver também [RUNBOOK-INCIDENTES.md](./RUNBOOK-INCIDENTES.md).

# LGPD — Garça Cidadão (GovCidadao)

API FastAPI com rotas gratuitas (mesmo stack open source já em produção).

## Interface (cidadão)

No app **Garça Cidadão** (`/garca-cidadao/`), aba do menu **Privacidade (LGPD)**:

- **Baixar meus dados** — export JSON
- **Anonimizar minha conta** — confirmação `EXCLUIR` + senha

## Rotas (API)

| Método | Caminho | Auth | Descrição |
|--------|---------|------|-----------|
| GET | `/lgpd/me/export` | Bearer JWT | JSON com perfil, ocorrências, notificações e histórico |
| POST | `/lgpd/me/delete` | Bearer JWT | Anonimiza dados (`confirm: "EXCLUIR"` + senha) |

Base URL em produção: conforme proxy/nginx do Gov (ex. path `/gov` ou host dedicado).

### Exportar

```bash
curl -sS -H "Authorization: Bearer $GOV_TOKEN" \
  "https://SEU_HOST_GOV/lgpd/me/export"
```

### Excluir (anonimizar)

```bash
curl -sS -X POST -H "Authorization: Bearer $GOV_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"confirm":"EXCLUIR","password":"sua-senha"}' \
  "https://SEU_HOST_GOV/lgpd/me/delete"
```

## O que é alterado

- Ocorrências do cidadão: remove identificação do reporter; mantém registro para o município.
- Notificações in-app: removidas.
- Histórico: mensagens/nomes redigidos.
- Conta **local** Gov: anonimizada.
- Conta **Memorial** (`users` da API): e-mail/nome/telefone anonimizados na mesma base Mongo.

Para export completo da conta Memorial (pets, sepultados, etc.), o titular pode usar também `GET /api/lgpd/me/export` na API SEMIT.

## Testes

```bash
bash scripts/run-gov-pytest.sh
# ou: cd GovCidadao && JWT_SECRET=test pytest tests/test_lgpd.py -q
```

## Stack 100% gratuita (sem SaaS pago)

| Função | Ferramenta |
|--------|------------|
| Erros API Gov | Logs Docker (Sentry free opcional no backend Node) |
| Erros API SEMIT | Sentry free tier |
| Uptime | Cron + e-mail SMTP (`MONITOR-EXTERNO.md`) |
| Métricas | Prometheus + Grafana self-hosted (`FASE3-ESCALA.md`) |
| LGPD | Rotas próprias SEMIT + Gov |

# Playwright E2E — API-SEMIT

Smoke tests contra **staging ou produção** (não substituem Jest/pytest unitários).

## Executar no servidor ou CI

```bash
bash scripts/run-playwright.sh
```

Outra URL:

```bash
PLAYWRIGHT_BASE_URL=https://api.garca.sp.gov.br bash scripts/run-playwright.sh
```

## O que é testado

| Suite | Conteúdo |
|-------|----------|
| `api-smoke` | `/readyz`, `/health`, `/openapi.json` |
| `memorial` | Home, login, `auth-refresh.js`, sepultados público |
| `garca-cidadao` | Portal, login sem token na URL, health da API Gov |
| `security` | Redirect HTTP→HTTPS, header HSTS |

## CI

Workflow `.github/workflows/e2e-nightly.yml` — diário 06:00 UTC + disparo manual.

## Relatório

```bash
cd e2e && npm run report
```

Artefatos: `e2e/playwright-report/` (ignorado no Git).

## Credenciais

Fluxos com login real ficam para fase seguinte (`E2E_MEMORIAL_EMAIL` / `E2E_MEMORIAL_PASSWORD` em `.env` local, nunca no repositório).

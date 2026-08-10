# Fonte canônica do projeto API-SEMIT

## Diretório oficial (produção)

```text
/home/semit/Documentos/api-semit
```

O Docker Compose em produção usa este caminho (verificado em `com.docker.compose.project.working_dir`).

## O que NÃO é fonte de verdade

| Caminho | Uso |
|---------|-----|
| `full/project/` | Snapshot legado; **builds Flutter pinados** em `full/project/frontend/build/` |
| `full/prefeitura_app-main/` | Cópia legada do app; **não** sincronizar para a raiz nem usar para publicar `/servicos/` |
| `full/project-root/` | Subset antigo do compose |
| `deploy-package/`, `deploy-medicamentos/` | Pacotes parciais de deploy |
| `backend.pre_sync_bak.*` | Backups de código |

Edite e faça rebuild **somente** na raiz `api-semit`.

## Scripts

| Script | Deve rodar em |
|--------|----------------|
| `rebuild.sh` | Raiz `api-semit` |
| `scripts/publicar-flutter-web.sh` | Raiz — publica hub pinado + módulos sem downgrade |
| `scripts/promover-flutter-web.sh` | Raiz — único caminho para tornar um build novo a referência oficial |
| `scripts/flutter-web-builds.lock` | MD5s aprovados dos 4 módulos Flutter web |
| `backup_completo.sh` | Raiz — **backup manual** (não há cron de backup) |
| `scripts/backup-diario.sh` | Wrapper manual do backup (mesmo comportamento; não instalar em cron) |
| `docker compose` | Raiz `api-semit` |

## Portal `/servicos/` e módulos Flutter

Documentação completa: **[PORTAL-SERVICOS-WEB.md](./PORTAL-SERVICOS-WEB.md)**

Resumo:

- Nginx: `frontend/build/` → `/servicos/`, `/agendamentos/`, `/formularios/`, `/iluminacao/`
- Hub correto: build pinado em `full/project/frontend/build/servicos/` (“Serviços Web Integrados”, 3 cards)
- Lock: `scripts/flutter-web-builds.lock`
- Fluxo de atualização: compilar → testar → `./scripts/promover-flutter-web.sh <modulo>`
- **Não** usar HTML em `frontend/public/servicos/` nem Dart substituto (`services_home_screen.dart`)
- **Não** fazer `rsync full/prefeitura_app-main/ prefeitura_app-main/` para “atualizar” o portal web

## Sem Git

O projeto não depende de Git para deploy. Pastas `.github/` são opcionais (CI); podem ser ignoradas.

## Variáveis de ambiente

| Arquivo | Escopo |
|---------|--------|
| `.env` (raiz) | Compose: `JWT_SECRET`, `GOVCIDADAO_JWT_SECRET` |
| `backend/.env` | Container `api` (Express) |

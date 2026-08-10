# Rotação de secrets — API-SEMIT

Procedimento para **produção** (servidor `semit`, `docker compose` em `/home/semit/Documentos/api-semit`). **Execute após backup** (`backup_completo.sh` ou `scripts/verificar-backup.sh`).

## Secrets a rotacionar

| Variável | Arquivo | Impacto |
|----------|---------|---------|
| `JWT_SECRET` | `backend/.env` + raiz `.env` (compose) | Todos os JWT Memorial/API invalidados — usuários fazem login de novo |
| `GOVCIDADAO_JWT_SECRET` | raiz `.env` | Sessões GovCidadao invalidadas |
| `API_KEYS` | `backend/.env` (se usado) | Integrações com X-API-Key precisam nova chave |
| `GROQ_API_KEY` / `GEMINI_API_KEY` | `backend/.env` | Só IA/medicamentos — rotacionar no painel do provedor |

**Não commitar** valores novos no Git.

## Gerar valores fortes

```bash
bash /home/semit/Documentos/api-semit/scripts/gerar-novos-secrets.sh
```

Copie a saída para os `.env` em janela de manutenção.

## Checklist (ordem)

1. [ ] Backup verificado: `bash scripts/verificar-backup.sh`
2. [ ] Aviso aos usuários (login será necessário após rotação JWT)
3. [ ] Gerar novos secrets (`gerar-novos-secrets.sh`)
4. [ ] Atualizar `backend/.env` e `.env` na raiz (mesmo `JWT_SECRET` nos dois se compose usar fallback)
5. [ ] `cd /home/semit/Documentos/api-semit && docker compose stop api govcidadao-api`
6. [ ] `docker compose up -d --build api govcidadao-api govcidadao-frontend`
7. [ ] `curl -s https://api.garca.sp.gov.br/readyz` → `ready: true`
8. [ ] Login Memorial + Garça Cidadão (teste manual)
9. [ ] Registrar data/responsável abaixo

## Registro

| Data | Responsável | Secrets rotacionados | Observações |
|------|-------------|----------------------|-------------|
| 2026-06-03 | SEMIT (produção) | `JWT_SECRET`, `GOVCIDADAO_JWT_SECRET` | Backup `.env.bak.20260603_153657`; `docker compose up -d --build api govcidadao-api` |

## Rollback

Restaurar `.env` anterior (do backup em `full/project-root` ou snapshot) e `docker compose up -d --build api govcidadao-api`.

Ver [RESTORE-BACKUP.md](./RESTORE-BACKUP.md) para desastre completo.

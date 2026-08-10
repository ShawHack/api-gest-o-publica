# Manutenção de disco (produção api-semit)

## Partições

| Montagem | Uso típico |
|----------|------------|
| `/` | Sistema, apt, Docker (até migrar) |
| `/home` | Projetos, backups, `docker-data` (após migração) |

## Já aplicado (sem sudo)

- Cache de build Docker removido (`docker builder prune`)
- Imagens órfãs antigas removidas (~0,5 GB)
- Backups `API-SEMIT`: removidos 3 snapshots duplicados de 2026-04-22; mantidos `.tar.gz` de 2026-05-06 e 2026-04-24 (pastas `full/` extraídas removidas)
- Criado `/home/semit/docker-volumes` para futuros bind mounts

## Requer sudo (executar manualmente)

### 1. Liberar espaço na raiz (~20 GB de cache apt)

```bash
sudo bash /home/semit/Documentos/api-semit/scripts/limpar-raiz-seguro.sh
```

### 2. Migrar Docker para `/home` (downtime ~2–10 min)

```bash
sudo bash /home/semit/Documentos/api-semit/scripts/migrar-docker-para-home.sh
```

Depois validar:

```bash
curl -s http://localhost/api/health
docker compose -f /home/semit/Documentos/api-semit/docker-compose.yml ps
```

## Política de backups sugerida

- Manter 2 snapshots recentes em `~/backups/API-SEMIT/` (só `.tar.gz`)
- Não manter pasta `full/` ao lado do tar (dobra o espaço)

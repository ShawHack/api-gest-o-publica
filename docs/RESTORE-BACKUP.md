# Restauração de backup — API-SEMIT

Procedimento para **homologação** ou **desastre**. Leia antes de executar em produção.

## Pré-requisitos

- Backup recente em `~/Documentos/backups-completos/YYYY-MM-DD_HH-MM-SS/`
- Docker instalado
- Janela de manutenção (portal ficará fora)

## 1. Verificar backup (sem alterar produção)

```bash
bash /home/semit/Documentos/api-semit/scripts/verificar-backup.sh
```

## 2. Parar escritas

```bash
cd /home/semit/Documentos/api-semit
docker compose stop api govcidadao-api
```

## 3. Restaurar MongoDB

Localize o dump:

```text
~/Documentos/backups-completos/<DATA>/full/mongo/backup/
```

Copie para o container e restaure:

```bash
MONGO_C=mongo
BACKUP_DIR="$HOME/Documentos/backups-completos/<DATA>/full/mongo/backup"
docker cp "$BACKUP_DIR" "${MONGO_C}:/data/restore_dump"

docker exec -it "$MONGO_C" mongorestore --drop /data/restore_dump
```

> `--drop` apaga coleções atuais. Use só em restore completo autorizado.

## 4. Restaurar uploads (imagens)

```bash
BACKUP_IMAGES="$HOME/Documentos/backups-completos/<DATA>/full/images"
docker run --rm -v api-semit_apicemiterio_data:/data \
  -v "$BACKUP_IMAGES":/backup:ro alpine \
  sh -c "cp -a /backup/. /data/apicemiterio/"
```

Ajuste o nome do volume se `docker volume ls` mostrar outro prefixo.

## 5. Subir serviços

```bash
cd /home/semit/Documentos/api-semit
docker compose up -d
bash scripts/uptime-check.sh
```

## 6. Validação pós-restore

| Check | Comando / ação |
|-------|----------------|
| API | `curl https://api.garca.sp.gov.br/readyz` |
| Login admin Memorial | Teste manual |
| Contagem usuários | `docker exec mongo mongosh apicemiterio --eval 'db.users.countDocuments()'` |
| Imagens | Abrir um sepultado/pet com foto |

## RPO / RTO de referência

| Métrica | Valor típico |
|---------|----------------|
| **RPO** | Até 24 h (backup diário 02:30) |
| **RTO** | 2–8 h (primeira vez pode ser mais) |

## Teste trimestral recomendado

1. Clonar volume ou restaurar em VM de teste.
2. Registrar data, duração e problemas em `docs/RESTORE-BACKUP-LOG.md` (criar na primeira execução).

## Rollback

Se o restore falhar, manter containers parados e usar backup **anterior** (pasta com data imediatamente anterior em `backups-completos`).

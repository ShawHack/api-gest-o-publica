# Restauração de backup — API SEMIT

Dois caminhos: **mesmo servidor** (incidente local) e **host novo** (desastre).
Os comandos destrutivos exigem autorização explícita.

## O que o backup diário passa a incluir

- Código do projeto e da API
- Dump MongoDB (`apicemiterio`, `govcidadao`, `semit`, `teatro_db`)
- Uploads (`/data/apicemiterio`)
- Frontend publicado, Nginx, certificados Let's Encrypt
- **Segredos em arquivo real** (`full/secrets/`, permissão 600) — não é mais symlink
- Árvore `runtime/` (assets + secrets)
- Persistência Redis
- TV corporativa: volume de dados, configuração do container, fonte e imagem Docker
- Grafana: volume persistente e imagem Docker
- Prometheus: volume persistente e imagem Docker
- Volumes auxiliares do Certbot e do MongoDB
- Imagens Docker (`docker-images-*.tar.gz`) para subir sem rebuild
- `inventory.json` (compose, volumes, commit)

Agendamento: **01:15** no crontab do usuário `semit`.  
RPO nominal: até 24 h. Retenção local padrão: **14 dias**.

Pasta: `~/Documentos/backups-completos/YYYY-MM-DD_HH-MM-SS/`

## A. Desastre — subir em outro servidor

Requisitos no host novo: Docker Engine + plugin Compose, `rsync`, espaço livre
(cerca de 15–20 GB além do tamanho do backup).

1. Copie a pasta do backup (payload `.tar.gz` **e** `docker-images-*.tar.gz` + `.sha256`).
2. Confira os checksums:

```bash
cd /caminho/do/backup
sha256sum -c api-semit-backup-*.tar.gz.sha256
sha256sum -c docker-images-*.tar.gz.sha256
tar -tzf api-semit-backup-*.tar.gz >/dev/null
```

3. Extraia o payload se a pasta `full/` ainda não existir:

```bash
tar -xzf api-semit-backup-*.tar.gz
```

4. Restaure (destrutivo no destino):

```bash
# No servidor NOVO — recusa rodar no hostname SEMIT
bash /caminho/do/projeto/scripts/restore-host-novo.sh \
  --backup-dir /caminho/do/backup \
  --target "$HOME/Documentos/api-gestao-publica" \
  --runtime "$HOME/runtime/api-gestao-publica" \
  --iniciar \
  --eu-autorizo-restore
```

O script carrega as imagens, recria projeto e runtime, inicia `rs0`, executa
`mongorestore --drop`, devolve uploads/Redis/TLS e restaura os volumes da TV,
Grafana, Prometheus e Certbot antes de subir a stack.

5. DNS: aponte `api.garca.sp.gov.br` para o IP novo. Confira:

```bash
curl -fsS http://127.0.0.1:5000/readyz
curl -fsS https://api.garca.sp.gov.br/health
```

6. Valide todos os componentes:

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}'
curl -fsS http://127.0.0.1:3050/health || curl -fsS http://127.0.0.1:3050/
curl -fsS http://IP_DO_SERVIDOR:3001/api/health
curl -fsS http://IP_DO_SERVIDOR:9090/-/ready
```

Teste também login admin, uma foto de sepultado/pet, programação da TV,
dashboards do Grafana e consultas do Prometheus.

## B. Mesmo servidor (homologação / rollback de dados)

```bash
cd /home/semit/Documentos/api-gestao-publica
BASE_DIR=/home/semit/Documentos/backups-completos bash scripts/verificar-backup.sh
UPDATE_LOG=1 bash scripts/teste-restore-homologacao.sh
```

O segundo comando usa Mongo temporário e **não** altera produção.

Restore destrutivo no Mongo de produção (só com autorização):

```bash
docker compose stop api govcidadao-api job-worker email-worker
BACKUP_DIR="/home/semit/Documentos/backups-completos/<DATA>/full/mongo/backup"
docker cp "$BACKUP_DIR/." mongo:/data/restore_dump/
docker exec mongo mongorestore --drop /data/restore_dump
docker compose start api govcidadao-api job-worker email-worker
```

## Segurança

- Diretórios de backup `700`; tar, segredos e env dumps `600`.
- Não publique `full/secrets/` nem `env_runtime_api.txt` em repositório Git.
- Mantenha a cópia externa confirmada por SHA-256 e as gerações locais.

## Rollback

Se o restore falhar, não apague o backup nem os logs. Use a geração
anterior em `backups-completos/` e registre em `docs/RESTORE-BACKUP-LOG.md`.

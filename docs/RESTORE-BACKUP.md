# Restauração de backup — API-SEMIT

Procedimento para homologação ou desastre. Os comandos destrutivos estão identificados e exigem autorização explícita.

## Localização e objetivo

- Repositório: `/home/semit/Documentos/api-gestao-publica`
- Backups: `/home/semit/Documentos/backups-completos/YYYY-MM-DD_HH-MM-SS/`
- Agendamento: diariamente às **01:15** (`crontab` do usuário `semit`)
- RPO nominal: até 24 horas; RTO de referência: 2–8 horas

## 1. Validação sem alterar produção

```bash
cd /home/semit/Documentos/api-gestao-publica
BASE_DIR=/home/semit/Documentos/backups-completos bash scripts/verificar-backup.sh
UPDATE_LOG=1 bash scripts/teste-restore-homologacao.sh
```

O segundo comando cria um Mongo temporário sem rede, restaura e consulta o conteúdo, depois remove o contêiner. Não usa o Mongo de produção.

## 2. Preparação para desastre

1. Registre o backup escolhido e seu tamanho.
2. Confirme espaço livre e guarde uma cópia do estado atual antes de sobrescrever dados.
3. Abra janela de manutenção e bloqueie escritas.

```bash
cd /home/semit/Documentos/api-gestao-publica
docker compose stop api govcidadao-api job-worker email-worker
```

## 3. Restaurar MongoDB — destrutivo

Substitua `<DATA>` por uma pasta já validada. `mongorestore --drop` apaga as coleções atuais; execute somente com autorização.

```bash
BACKUP_DIR="/home/semit/Documentos/backups-completos/<DATA>/full/mongo/backup"
docker cp "$BACKUP_DIR/." mongo:/data/restore_dump/
docker exec mongo mongorestore --drop /data/restore_dump
```

## 4. Restaurar uploads

Descubra primeiro o volume real, sem presumir o prefixo:

```bash
docker inspect api --format '{{range .Mounts}}{{println .Name "->" .Destination}}{{end}}'
```

Depois copie `full/images/` para o destino exibido para `/data/apicemiterio`, preservando antes uma cópia do volume atual.

## 5. Código, configuração e certificados

Use `full/project/`, `full/project-root/`, `full/nginx/` e `full/letsencrypt/` como fontes. Compare antes de copiar; variáveis de ambiente e certificados contêm segredos. Recrie os serviços com o `docker-compose.yml` restaurado somente após validar caminhos, volumes e imagens.

## 6. Subir e validar

```bash
cd /home/semit/Documentos/api-gestao-publica
docker compose up -d
bash scripts/uptime-check.sh
curl -fsS https://api.garca.sp.gov.br/readyz
docker exec mongo mongosh --quiet --eval 'print(db.getSiblingDB("apicemiterio").users.countDocuments())'
```

Também valide login administrativo e ao menos uma imagem em cada área crítica.

## Rollback

Se falhar, mantenha os serviços de escrita parados. Restaure a cópia prévia do banco/volume ou repita com o backup validado imediatamente anterior. Não apague o backup que falhou nem os logs; registre o incidente em `docs/RESTORE-BACKUP-LOG.md`.

# Registro de testes de restore

| Data | Responsável | Backup usado | Duração | Resultado | Observações |
|------|-------------|--------------|---------|-----------|-------------|
| 2026-06-03 | SEMIT / manutenção | `2026-06-03_14-35-11` | ~18 min | **Snapshot criado** | Ponto de restauração antes de seguir Fase 2 do plano (não é teste de restore) |
| 2026-06-03 | `teste-restore-homologacao.sh` | `2026-06-03_14-35-11` | ~2 min | **OK** | mongorestore em Mongo temporário (27099); ~36k docs; contagens users/sepultados OK |

## Snapshot ativo (referência rápida)

```text
~/Documentos/backups-completos/2026-06-03_14-35-11/
├── full/mongo/backup/          # mongodump
├── full/project/               # código (sem node_modules)
├── api-semit-backup-*.tar.gz   # pacote compactado (~7 GB)
└── backup.log
```

Ver procedimento completo: [RESTORE-BACKUP.md](./RESTORE-BACKUP.md).

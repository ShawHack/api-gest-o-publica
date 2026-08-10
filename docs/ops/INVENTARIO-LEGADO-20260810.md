# Inventário de legado — 10/08/2026

Levantamento realizado no servidor em `/home/semit/Documentos/api-semit`.

| Caminho | Tamanho | Arquivos rastreados | Situação |
|---|---:|---:|---|
| `full/` | 8,9 GB | 3.170 | Legado documentado; não usado por mounts ativos, mas ainda rastreado pelo Git. |
| `backend.pre_sync_bak.20260324093200/` | 209 MB | 274 | Backup pré-sincronização; não usado por mounts ativos. |
| `deploy-package/` | 96 KB | 6 | Pacote de implantação antigo; não usado por mounts ativos. |
| `deploy-medicamentos/` | 172 KB | 7 | Ainda referenciado por `deploy-medicamentos.sh`; manter. |
| `dump-semit/` | 4 KB | 0 | Diretório vazio/não rastreado; sem impacto relevante. |
| `tmp_restore_arvores/` | 1,1 MB | 2 | Evidência de restauração; rastreada pelo Git. |

## Decisão

Nenhum diretório foi movido ou excluído durante o levantamento.

Embora `full/` e o backup pré-sync não apareçam nos bind mounts dos containers, removê-los diretamente da árvore de produção geraria milhares de exclusões no working tree já divergente. A retirada deve ocorrer em uma branch de manutenção, com revisão do diff e validação de build antes de chegar ao servidor.

## Procedimento recomendado

1. Criar uma branch de manutenção a partir de uma cópia limpa do repositório.
2. Remover do índice Git os legados aprovados, preservando um arquivo externo verificável por SHA-256.
3. Reproduzir os builds React, Flutter, FastAPI/Next.js e containers a partir das fontes canônicas.
4. Comparar as rotas públicas e os artefatos gerados com a produção.
5. Integrar a mudança revisada e somente então arquivar fisicamente os diretórios no servidor.

## Restrições

- Não remover `deploy-medicamentos/` enquanto `deploy-medicamentos.sh` existir ou for usado.
- Não remover builds servidos por `nginx`, `api` ou volumes/bind mounts ativos.
- Não usar limpeza automática por extensão contra a raiz do projeto.

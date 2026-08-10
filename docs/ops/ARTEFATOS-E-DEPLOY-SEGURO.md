# Fonte canônica, artefatos e deploy seguro

## Fonte canônica

A raiz canônica de produção é `/home/semit/Documentos/api-semit`.

- `backend/`: API Node.js/Express, rotas, modelos e workers.
- `frontend/src/`: código-fonte React.
- `prefeitura_app-main/lib/`: código-fonte Flutter.
- `GovCidadao/`: FastAPI e frontend Next.js.
- `Ferramentas/src/`: aplicação Next.js de ferramentas.
- `nginx/`, `monitoring/` e `docker-compose.yml`: infraestrutura ativa.

## Artefatos gerados

Não devem ser tratados como fonte para edição manual:

- `frontend/build/`
- `backend/public/static/`
- builds Flutter publicados em `backend/public/` e `frontend/build/`
- `dist/`
- `node_modules/`
- `.dart_tool/`
- relatórios de cobertura, Playwright e testes
- arquivos `.zip`, `.tar` e `.tar.gz` de entrega

Alguns desses artefatos ainda são rastreados pelo Git ou servidos em produção. Não devem ser removidos em massa antes de confirmar o pipeline que os recria.

## Legado e cópias

Tratar inicialmente como somente leitura:

- `full/`
- `backend.pre_sync_bak.*`
- arquivos `*.bak*` e `*.backup*`
- `deploy-package/`
- `deploy-medicamentos/`
- pacotes compactados na raiz

Antes de mover ou excluir, verificar referências em Nginx, Docker Compose, scripts de publicação e documentação operacional.

## Deploy seletivo

Para atualizar apenas serviços alterados, usar:

```bash
./scripts/deploy-seletivo.sh api email-worker job-worker
```

Outros exemplos:

```bash
./scripts/deploy-seletivo.sh govcidadao-api govcidadao-frontend
./scripts/deploy-seletivo.sh ferramentas
./scripts/deploy-seletivo.sh nginx
```

O script valida a configuração e executa `docker compose up -d --build --no-deps` somente para os serviços informados. Ele não executa `docker compose down`.

## Rebuild completo

`rebuild.sh` continua sendo necessário quando React e múltiplos módulos Flutter precisam ser recompilados e republicados juntos. Por enquanto ele deve ser considerado uma operação com janela de manutenção, porque derruba toda a stack.

## Próxima limpeza segura

1. Confirmar quais builds devem permanecer versionados.
2. Criar um release reproduzível a partir das fontes canônicas.
3. Comparar o release com os diretórios atualmente servidos.
4. Remover artefatos do Git em uma branch de manutenção, não diretamente em produção.
5. Arquivar legados fora da raiz somente após validar restauração e referências.

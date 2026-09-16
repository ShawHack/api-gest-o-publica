# SAMA e GarçaPet — entrega de 04/09/2026

## Estado publicado

A Secretaria usa `/sama/` e os serviços ambientais usam `/sama/arvores`, `/sama/arvore/...`, `/sama/castracao`, `/sama/zoologico`, `/sama/denunciar`, `/sama/funcionalidade` e `/sama/vacinacao`. A adoção mantém `/garcapet/`. Autenticação, administração, APIs e base única de usuários não foram migradas.

`release-20260904/` é a referência final publicada: HTML, manifesto, camada visual, compatibilidade de rotas, scripts legados versionados, bundle com aliases e configuração Nginx. Os arquivos `index.html`, `identity.js` e `manifest.json` na raiz desta pasta registram a etapa visual anterior à migração: **não publicá-los sobre a release final**.

## Operação e restauração

1. Identificar o diretório real publicado e a configuração efetivamente carregada no proxy. Produção observada: `/home/semit/Documentos/api-semit/backend/public/sama/` e `nginx/nginx.conf`.
2. Fazer backup dos arquivos e configuração atuais. Preservar `static/`, imagens, `config.js` e os scripts legados: a release é incremental, não um backup completo do portal.
3. Copiar somente os arquivos web da release para a pasta SAMA; **não copiar nginx.conf para a pasta pública**. Copiar assets antes do index. Nunca apagar arquivos anteriores durante essa implantação.
4. Comparar a configuração Nginx de referência com a atual e incorporar somente as regras SAMA. Não substituir a configuração de outros serviços cegamente.
5. Executar `nginx -t`, conferir SHA-256 do arquivo no host e do arquivo montado no container e aplicar recarga suave. Se houver divergência, parar e diagnosticar a montagem. A primeira tentativa teve essa divergência e foi revertida; a tentativa final carregou o mesmo hash em ambos os locais.
6. Validar as páginas e os redirecionamentos conforme VALIDACAO.md. Não criar usuários ou solicitações de teste em produção.

Backup da migração: `/home/semit/Documentos/deploy-backups/sama-routes-20260904/`. Para rollback, restaurar index, identity.js, manifest e as regras anteriores do Nginx; testar configuração, conferir a montagem e recarregar. Os novos arquivos versionados podem permanecer sem referência. Backup da identidade anterior: `/home/semit/Documentos/deploy-backups/sama-identity-20260904/`.

## Manutenção

`prepare-routes.cjs` documenta a transformação mecânica do build legado. Ele pressupõe arquivos e versões da época; revisar antes de reutilizar. Não substitui a reconciliação futura com o projeto React original. Não adicionar credenciais a este diretório.

Testes: `node sama-identity/test.cjs` e `node sama-identity/test-routes.cjs`. Requerem jsdom instalado; atualmente resolvido a partir de `agenda-web/node_modules/jsdom` no repositório do servidor. Para outro servidor, ajustar essa resolução ao local instalado. A migração foi testada sem gravar dados na API.

Correções de Cultura incluídas no mesmo commit: link do cartaz do Teatro agora aponta para `/cultura/eventos/detalhes.html`; datas de sessões são interpretadas como dias de calendário, sem recuo de um dia pelo fuso. Fontes: `cultura-src/teatro/teatro.html` e `teatro/teatro.html`. Backups de produção: `deploy-backups/cultura-teatro-20260904-link/` e `deploy-backups/cultura-teatro-20260904-data/`.

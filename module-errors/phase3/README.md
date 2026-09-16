# Etapa 3 — erros nativos de Educação e Documentos

Entrega de 04/09/2026, vinculada ao plano oficial no `MAPA_DO_TESOURO.md`.

## Conteúdo

- `EducationErrorBoundary.js`: limite de erro e apresentação 404 do portal Educação.
- `InstitutionalError.tsx`, `not-found.tsx`, `error.tsx` e `global-error.tsx`: convenções nativas do Next.js 16.3.1 para Documentos.
- `docs-pages/`: substituição reproduzível da antiga rota curinga de Documentos pelas seis rotas legítimas explícitas.
- `qa/`: verificações isoladas de compilação, apresentação, links e ausência de detalhes internos.

## Produção e reversão

Educação foi compilada a partir do frontend versionado e publicada como arquivos estáticos, sem reinício. O `index.html` anterior está em `/home/semit/Documentos/deploy-backups/module-errors-20260904-phase3/education-runtime/`; os novos arquivos com hash ficam inertes depois que o index for restaurado.

Documentos usa a imagem `sd_docs-web:phase3-errors-20260904`, id `448cc2f4d7e34358d42807e0395905ed9156b481b5e1721cede1887c1b51394e`. A anterior está preservada como `sd_docs-web:pre-phase3-errors-20260904`. Para reverter, retague a anterior como `sd_docs-web:latest`, recrie somente o serviço `web` pelo `docker-compose.prod.yml`, valide `/docs/platform-admin/login` e recarregue suavemente o Nginx. Não reinicie API ou banco.

Os fontes anteriores ficam em `/home/semit/Documentos/deploy-backups/module-errors-20260904-phase3/`. Compare o estado corrente antes de restaurá-los para não sobrescrever entregas posteriores.

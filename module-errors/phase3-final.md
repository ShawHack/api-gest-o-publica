### Etapa 3 — tratamento nativo de erros em Educação e Documentos (04/09/2026)

- [x] Localizar os roteadores e fontes de produção; Educação usa React Router e Documentos usa Next.js 16.3.1 com base `/docs`.
- [x] Educação: adicionar página de rota desconhecida e limite de erro React, preservando rotas de conselhos, administração, autenticação e conteúdo.
- [x] Documentos: adicionar `not-found`, `error` e `global-error` nativos, sem expor mensagens internas, alterar cookies ou substituir erros de negócio.
- [x] Testar renderização normal, falha controlada, recuperação e links em ambiente isolado; conferir diferenças entre fonte e build publicado.
- [x] Publicar somente após build validado e revisão do escopo, com backup e reversão. A rota curinga de Documentos foi substituída pelas seis rotas legítimas explícitas para preservar 404 HTTP real.
- [x] Registrar evidências, limites e estado real da publicação neste mapa.

**Resultado:** concluído e publicado em 04/09/2026. Educação recebeu rota interna 404 e limite de erro nativo React; publicação estática, sem reinício. Documentos recebeu as convenções nativas do Next.js e uma imagem validada isoladamente; somente `sd_docs-web` foi recriado, mantendo API e banco. O Nginx foi validado e recarregado suavemente para atualizar o destino.

**Evidências:** build Educação concluído (há avisos ESLint antigos e fora desta entrega; o modo CI os eleva a erro). Build Documentos concluiu compilação, TypeScript e 37 páginas. Em QA isolado, login respondeu 200, rota inexistente 404 e as seis rotas antes atendidas pelo curinga continuaram 200: estrutura/organograma, estrutura/contatos, estrutura/fila-assinaturas, notificações, minha-conta e relatórios. Em produção, navegador confirmou 404 institucional de Educação e Documentos e as páginas iniciais/login normais. HTTP confirmou dashboard, API, SAMA, GarçaPet, Agenda, Cultura e Rotas Rurais em 200. API permanece saudável. `tv-semit` continua unhealthy, condição anterior e não causada por esta entrega.

**Códigos HTTP:** Documentos retorna 404 real para rota desconhecida. Educação é SPA: o servidor entrega seu shell com 200 e o React apresenta a tela interna 404; isso é esperado porque a decisão de rota ocorre no navegador. Arquivos inexistentes e rotas desconhecidas fora do SPA continuam sob a proteção HTTP global da etapa 1.

**Segurança e dados:** mensagens não exibem exceção, stack ou identificadores internos. Nenhuma conta, cookie, sessão, permissão, API ou dado foi alterado. Falhas fatais foram exercitadas apenas em teste isolado; não foi provocada indisponibilidade em produção. Erros de negócio e 401/403 continuam com seus fluxos originais.

**Arquivos e recuperação:** artefatos reproduzíveis em `module-errors/phase3/`. Backup em `/home/semit/Documentos/deploy-backups/module-errors-20260904-phase3/`. Educação: restaurar `education-runtime/index.html` (e manifestos, se necessário); assets novos ficam inertes. Documentos: imagem ativa `448cc2f4d7e34358d42807e0395905ed9156b481b5e1721cede1887c1b51394e`; anterior preservada como `sd_docs-web:pre-phase3-errors-20260904`. Retag da anterior e recriação apenas de `web` fazem a reversão; validar login e recarregar Nginx. Não tocar em volumes, API ou banco.


### Etapa 3 — tratamento nativo de erros em Educação e Documentos (04/09/2026)

- [x] Localizar os roteadores e fontes de produção; Educação usa React Router e Documentos usa Next.js 16.3.1 com base `/docs`.
- [ ] Educação: adicionar página de rota desconhecida e limite de erro React, preservando rotas de conselhos, administração, autenticação e conteúdo.
- [ ] Documentos: adicionar `not-found`, `error` e `global-error` nativos, sem expor mensagens internas, alterar cookies ou substituir erros de negócio.
- [ ] Testar renderização normal, falha controlada, recuperação e links em ambiente isolado; conferir diferenças entre fonte e build publicado.
- [ ] Publicar somente após build validado e revisão do escopo, com backup e reversão. Não substituir o frontend compartilhado ou reiniciar Documentos a partir de fonte não reconciliado.
- [ ] Registrar evidências, limites e estado real da publicação neste mapa.

Restrições: não criar usuários/dados de teste em produção; não alterar permissões, APIs nem banco. Documentos tem alterações locais que devem ser preservadas (muitas são apenas finais de linha). Educação compartilha o frontend do Memorial: a publicação requer conferir o bundle atual, que pode ter recebido outras entregas. A proteção global das etapas anteriores permanece ativa.


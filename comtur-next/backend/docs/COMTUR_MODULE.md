# Módulo COMTUR

Primeiro incremento da Fase 1 do Portal Municipal de Turismo, incorporado à API SEMIT.

**Decisão (09/09/2026):** a vitrine pública atual será **substituída** por um portal novo (Visit Garça). Este módulo não é o site de destino; é governança do conselho (reuniões e documentos) na mesma API. O HTML `/comtur-portal.html`, o `mapaturistico` e o guia Destinos Inteligentes como entrada institucional deixam de ser a face oficial no cutover. Não evoluir essas superfícies: construir o portal novo e redirecionar.

## Entrega atual

- Modelo `ComturMeeting` para reuniões ordinárias e extraordinárias.
- Documentos estruturados por tipo: convocação, pauta, ata, presença, anexo e gravação.
- Estados editoriais preparados: rascunho, revisão, publicado e arquivado.
- Consulta pública paginada, com filtros por ano, tipo e texto.
- Detalhe público por slug.
- Publicação segura: somente registros com `status=published` são retornados.

## Endpoints

- `GET /api/comtur/meetings?year=2026&type=ordinaria&q=turismo&page=1&limit=20`
- `GET /api/comtur/meetings/:slug`

Administração autenticada (`admin` ou `admin-comtur`):

- `GET /api/comtur/admin/meetings`
- `GET /api/comtur/admin/meetings/:id`
- `POST /api/comtur/admin/meetings`
- `PUT /api/comtur/admin/meetings/:id`
- `POST /api/comtur/admin/meetings/:id/transition`

O fluxo editorial permitido é `draft → review → published`. Conteúdo publicado precisa voltar para revisão antes de ser editado. Arquivamento é explícito e todas as mutações são auditadas.

O Nginx pode remover `/api` ao encaminhar a requisição; por compatibilidade, a API também registra as rotas internamente em `/comtur`.

## Próximos passos

1. Designar usuários aos perfis de gestão do COMTUR na identidade central.
2. Publicar o portal novo Visit Garça em `/turismo/` (substitui HTML público, mapaturistico e Destinos Inteligentes como vitrine).
3. Homologar conteúdo oficial do catálogo e das atas.
4. No cutover, redirecionar `/comtur-portal.html` e `/mapaturistico/` para o portal novo.

## Critérios de aceite

- Consultas públicas nunca expõem rascunhos, itens em revisão ou arquivados.
- Filtros inválidos retornam HTTP 422.
- Página e limite são normalizados; o limite público máximo é 100.
- Busca trata caracteres especiais como texto literal.
- O detalhe retorna HTTP 404 para slug inexistente ou não publicado.
- Os testes unitários e a validação de sintaxe passam antes de qualquer deploy.

## Dependências

- MongoDB e Mongoose da API SEMIT.
- Conteúdo oficial: numeração, datas, local, pautas, atas e deliberações.
- Definição administrativa de papéis e responsáveis por publicação.
- Storage e política de acessibilidade para documentos oficiais.

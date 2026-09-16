### Plano oficial — integração do Mapa Turístico ao Turismo Garça e Pontos QR (15/09/2026)

**Objetivo:** tornar o catálogo do portal `/turismo/` a fonte oficial dos locais turísticos, incorporar a visualização cartográfica e vincular QR Codes aos locais, sem duplicar cadastros nem perder os 41 pontos do mapa legado.

1. [ ] Inventariar e exportar os 41 pontos, fotos e categorias do mapa legado; registrar contagens e inconsistências sem alterar dados.
2. [ ] Ampliar o conteúdo turístico com localização estruturada, coordenadas, origem/migração e configuração QR; manter compatibilidade com conteúdos COMTUR existentes.
3. [ ] Criar migração idempotente: simulação obrigatória, importação inicial como `draft`, chave de origem única e relatório de itens ignorados/conflitantes.
4. [ ] Criar página pública estável `/turismo/local/{slug}` e API pública por slug; QR nunca deve apontar para ObjectId ou URL administrativa.
5. [ ] Incorporar mapa ao portal Turismo Garça usando somente locais publicados com coordenadas válidas; filtros e lista acessível devem funcionar sem depender apenas do mapa visual.
6. [ ] Substituir o formulário genérico “Ponto QR” por seção do local: habilitação, identificação da placa, situação, instalação, manutenção e geração PNG/PDF.
7. [ ] Preservar `/mapaturistico/` e páginas antigas durante homologação; mapear redirecionamentos por ID para o slug novo e só ativá-los após revisão/publicação dos registros.
8. [ ] Validar permissões centrais `admin`, `admin_comtur` e `admin-comtur`, testes, backup, rollback e publicação gradual; documentar evidências e pendências aqui.

**Regras de segurança e continuidade:** nenhuma importação direta como `published`; não apagar nem editar a coleção `pontos_turisticos`; não substituir URLs antigas antes de existir correspondência validada; não gerar QR para rascunho; registrar auditoria das mutações; preservar uploads e base única de usuários.

**Estado inicial verificado:** mapa legado funcional em `/mapaturistico/`, 41 pontos ativos e administração exclusiva de `admin`. Portal `/turismo/` funcional, mas catálogo público sem atrativos; banco COMTUR contém 2 conteúdos de governança. O mapa ainda é acessado por link externo no portal novo. O formulário `qr_point` é genérico e não deve ser usado como cadastro paralelo.


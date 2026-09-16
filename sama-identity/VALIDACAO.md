# Validação da entrega

- Testes automatizados: aliases React, retorno ao caminho legado para compatibilidade, preservação de query/hash e login não migrado; navegação entre identidades e ausência de duplicação dos elementos adicionados.
- Navegador em produção: castração exibiu campanha e acesso ao formulário; links para adoção e árvores renderizaram conteúdo e marca corretos; tela de login compartilhado abriu normalmente.
- HTTP: zoológico, vacinação, health da API e Teatro/Cultura responderam 200. `/garcapet/castracao?origem=teste` respondeu 302 para `/sama/castracao?origem=teste`.
- Configuração Nginx validada; SHA-256 final conferido no host e container: `dd86e627b533e331b3076b3f684f9bc7a51f8bdf6116db4290ef06b3431ef941`. Recarga suave; sem reinício de containers da aplicação.
- Cultura: publicação Corpo História teve link, página de detalhes, API e assets conferidos. Datas 07/09/2026, 01/01/2026, 29/02/2028 e formato brasileiro passaram em São Paulo, UTC e Tóquio.
- Limites: não foram executados login autenticado, gravação de solicitações, fluxo administrativo completo ou homologação visual em todos os celulares. Esses testes continuam recomendados em homologação.
- Histórico: a primeira tentativa de rotas foi revertida após 404 de castração e divergência da configuração montada. Após autorização, a implantação final foi concluída e validada. Não há migração de URLs pendente nesta entrega.

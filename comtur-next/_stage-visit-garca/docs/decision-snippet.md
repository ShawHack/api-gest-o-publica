### Decisão de produto — substituição (09/09/2026)

O município **substitui** a vitrine turística atual por um **portal totalmente novo**. Não é evolução, skin nem carrossel sobre o que já está no ar.

O que deixa de ser a entrada oficial do visitante, no cutover:

- o HTML atual (`/comtur-portal.html` e telas administrativas estáticas associadas como face pública);
- o módulo legado `mapaturistico`;
- o guia externo Destinos Inteligentes (`guia.destinosinteligentes.tur.br/Garça/`) como vitrine institucional de Garça.

O que permanece e não é reescrito neste projeto:

- a API SEMIT, identidade `users`, MongoDB, auditoria, Nginx, backup e papéis;
- o COMTUR como **módulo de governança** (atas, legislação, composição) **dentro** do portal novo, não como site principal;
- Cultura/teatro, Agenda e Rotas Rurais como serviços a integrar, não a duplicar.

Regra: o visitante passa a usar só o portal novo (categorias, carrosséis, mapa, ficha). O conselho não aparece como home. Destinos Inteligentes pode existir na rede nacional, mas deixa de ser o endereço que a Prefeitura divulga. Cutover com backup, redirecionamentos e rollback; nada de operar dois portais oficiais em paralelo depois da troca.

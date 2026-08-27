# MAPA DO TESOURO — Plataforma de Gestão Pública SEMIT

> Guia universal de arquitetura, operação, continuidade e recuperação.
>
> Estado observado e atualizado em 27/08/2026 no servidor `10.15.25.28`.
> Este documento não contém senhas, tokens, chaves privadas nem valores secretos.

## 1. Finalidade

Este documento existe para permitir que uma pessoa que nunca trabalhou no projeto consiga:

- entender o que a plataforma entrega;
- localizar a fonte correta de cada componente;
- identificar onde ficam dados, uploads, segredos e builds;
- operar, diagnosticar e atualizar os serviços com segurança;
- compreender as dependências entre servidores;
- restaurar a plataforma em outro servidor após um desastre;
- saber quais documentos e scripts aprofundam cada procedimento.

Use este arquivo como índice principal. Procedimentos destrutivos continuam exigindo autorização e devem seguir os runbooks específicos.

## 2. Resumo executivo

A plataforma é um conjunto modular de serviços municipais publicado principalmente em `https://api.garca.sp.gov.br`. A entrada pública é o Nginx. Atrás dele existem:

- API principal Node.js/Express;
- MongoDB e Redis;
- workers de e-mail e tarefas;
- frontend principal e diversos portais estáticos;
- Garça Cidadão, com FastAPI e Next.js;
- Caixa de Ferramentas, em Next.js;
- TV corporativa;
- Grafana e Prometheus;
- integrações com Xibo, painel de senhas/Novo SGA, Firebase, SMTP, WhatsApp e serviços externos.

O servidor principal é `10.15.25.28`. Ele depende funcionalmente de:

| Endereço | Responsabilidade observada | Cobertura pelo backup local |
|---|---|---|
| `10.15.25.28` | API, bancos, portais, TV local, monitoramento e proxy | Sim |
| `10.15.25.29` | Xibo CMS, layouts, campanhas, biblioteca e XMDS | Não; exige backup próprio |
| `10.15.25.31` | Painel de senhas, triagem e Novo SGA | Não; exige backup próprio |

## 3. Fonte de verdade

### 3.1 Produção observada

O Docker informa que a stack principal em execução usa:

```text
/home/semit/Documentos/api-gestao-publica
```

Projeto Compose: `api-semit`.

Arquivos Compose efetivos:

```text
/home/semit/Documentos/api-gestao-publica/docker-compose.yml
/home/semit/Documentos/api-gestao-publica/monitoring/docker-compose.monitoring.yml
```

Commit observado: `f0c69e57`.

### 3.2 Divergência documental

`docs/FONTE-CANONICA.md` ainda aponta `/home/semit/Documentos/api-semit`. Essa informação está desatualizada para a stack principal observada em 26/08/2026.

O checkout `api-semit` ainda não pode ser descartado: a TV corporativa foi criada a partir dele e seu código está em:

```text
/home/semit/Documentos/api-semit/tv_corporativa
```

Em 27/08/2026 foi confirmada uma segunda dependência operacional desse checkout: embora o Compose seja controlado por `api-gestao-publica`, o container `nginx` mantém binds de publicação apontando para:

```text
/home/semit/Documentos/api-semit/frontend/build -> /usr/share/nginx/html
/home/semit/Documentos/api-semit/backend/public -> /opt/backend-public
/home/semit/Documentos/api-semit/nginx/nginx.conf -> /etc/nginx/conf.d/default.conf
```

Portanto, alterar ou compilar apenas `api-gestao-publica/frontend/build` não atualiza automaticamente o site em produção. Essa divergência deve ser eliminada futuramente de forma planejada; até lá, todo deploy web deve conferir os mounts efetivos do `nginx`.

Regra operacional:

- stack principal: trabalhar em `api-gestao-publica`;
- TV corporativa: confirmar o checkout e o Compose de origem antes de reconstruir;
- frontend/Nginx: compilar a partir da fonte versionada em `api-gestao-publica` e publicar de modo controlado no caminho efetivamente montado de `api-semit`;
- nunca sincronizar os dois diretórios indiscriminadamente;
- antes de qualquer deploy, confirmar `com.docker.compose.project.working_dir` com `docker inspect api` e os binds com `docker inspect nginx`.

## 4. Visão da arquitetura

```text
Internet / rede municipal
          |
          v
Nginx :80/:443/:8080/:8082/:8088/:8090
          |
          +--> API Express :5000
          |       +--> MongoDB :27017 (replica set rs0)
          |       +--> Redis :6379
          |       +--> email-worker
          |       +--> job-worker
          |       +--> Firebase / SMTP / WhatsApp / Sentry / IA
          |
          +--> GovCidadão API :8000 + frontend :3000
          +--> Ferramentas Next.js :3000
          +--> TV corporativa :3050
          +--> Frontends e assets montados no host
          +--> Xibo em 10.15.25.29
          +--> Painel de senhas / Novo SGA em 10.15.25.31

Monitoramento: Prometheus :9090 --> coleta métricas
               Grafana :3001   --> dashboards
```

Todos os containers principais compartilham a rede Compose `api-semit_stack`.

## 5. Serviços e containers

| Container | Tecnologia/imagem | Papel | Persistência |
|---|---|---|---|
| `nginx` | Nginx Alpine | TLS, entrada pública, estáticos e proxy reverso | Certificados, ACME, uploads e binds de assets |
| `api` | Node.js/Express | API principal e entrega de módulos | MongoDB, uploads e binds do runtime |
| `mongo` | MongoDB 6 | Banco principal, replica set `rs0` | `api-semit_mongo-data` e `/data/configdb` |
| `redis` | Redis 7 Alpine | filas, cache e coordenação de workers | `api-semit_redis-data` |
| `email-worker` | imagem da API | processamento assíncrono de e-mails | Redis/Mongo |
| `job-worker` | imagem da API | tarefas em segundo plano | Redis/Mongo |
| `govcidadao-api` | FastAPI | API Garça Cidadão | MongoDB |
| `govcidadao-frontend` | Next.js | frontend Garça Cidadão | imagem/código |
| `ferramentas` | Next.js | conversão e utilitários de documentos | imagem/código |
| `certbot` | Certbot | emissão e renovação TLS | Let's Encrypt e ACME |
| `tv-semit` | Node.js | player/sincronizador da TV corporativa | `api-semit_tv-semit-data` |
| `prometheus` | Prometheus 2.55.1 | coleta de métricas | `api-semit_prometheus-data` |
| `grafana` | Grafana 11.4.0 | visualização e alertas | `api-semit_grafana-data` |

Containers encontrados mas não confirmados como parte ativa:

- `api-fin`: estado `Created`;
- `intelligent_elbakyan`: parado há meses.

Não apagar containers desconhecidos sem identificar proprietário, dados e finalidade.

## 6. Diretórios importantes

| Caminho | Conteúdo |
|---|---|
| `backend/` | API Express, modelos, controladores, rotas, workers e testes |
| `frontend/` | frontend React e builds web |
| `GovCidadao/` | API FastAPI, frontend Next.js, testes e documentação |
| `Ferramentas/` | aplicação Next.js de conversão de documentos |
| `prefeitura_app-main/` | aplicativo Flutter municipal, mobile e web |
| `estradas_rurais_app/` | cliente Flutter de Estradas Rurais |
| `cultura-src/` | portal e ferramentas de Cultura/PNAB |
| `mapaturistico/` | módulo do mapa turístico |
| `nginx/` | configuração de publicação e proxy |
| `monitoring/` | Compose, Prometheus e provisioning do Grafana |
| `scripts/` | deploy, backup, restore, verificação, testes e operação |
| `docs/` | runbooks, planos e normas operacionais |
| `/home/semit/runtime/api-gestao-publica/` | segredos e assets efetivos separados do Git |
| `/home/semit/Documentos/backups-completos/` | backups diários locais |

## 7. Módulos funcionais

### 7.1 Identidade e acesso

- cadastro, login, sessão e verificação de e-mail;
- recuperação e redefinição de senha;
- JWT e refresh tokens;
- perfis como `admin`, `concessionario`, `monitor`, `rotas_admin` e usuário autenticado;
- permissões por módulo e trilha de auditoria.

### 7.2 Memorial e sepultados

- pesquisa, sugestões e detalhes;
- CRUD administrativo;
- imagens e comentários;
- atribuição de concessionário;
- agendamento, conclusão e moderação.

### 7.3 Garça Pet / SEMIT A PET

- pets, imagens, adoção e fila de interessados;
- chat, presença e notificações;
- denúncias, vacinação e campanhas de castração;
- privacidade de contatos e controles administrativos.

### 7.4 Serviços municipais

- agendamentos;
- Formulários Garça e inscrições;
- Iluminação Pública com QR Code;
- Ordem de Serviços;
- Arborização;
- medicamentos;
- educação;
- Cultura e PNAB;
- mapa turístico;
- votação interna;
- passagem de turno;
- auditoria e compliance LGPD.

### 7.5 Estradas Rurais

- UPAs e vínculos de proprietários;
- portal do produtor, login de operadores e administração;
- mapa público dos bairros rurais e localização/compartilhamento de propriedades;
- whitelist de veículos;
- alertas de placas desconhecidas;
- webhook Intelbras LPR;
- integração Firebase RTDB/service account;
- trilha LGPD e aprovações administrativas.

### 7.6 Garça Cidadão

- API FastAPI com Beanie/Motor;
- frontend Next.js;
- utiliza o MongoDB da plataforma;
- publicado sob `/garca-cidadao` e `/garca-cidadao-api/`.

### 7.7 Caixa de Ferramentas

- conversão e manipulação de PDF, DOCX, imagens e HEIC;
- Next.js, LibreOffice e bibliotecas de documentos;
- publicado sob `/ferramentas`.

## 8. API e persistência

### 8.1 Banco MongoDB

Bases observadas no backup e no servidor:

- `apicemiterio`;
- `govcidadao`;
- `semit`;
- `teatro_db`;
- `admin`.

`config` e `local` são bases internas do MongoDB e não substituem o dump lógico das bases de negócio.

Principais famílias de coleções/modelos:

- usuários, tokens e permissões;
- sepultados e DLOC;
- pets, adoções, vacinas, denúncias e castração;
- formulários e inscrições;
- iluminação e ordens de serviço;
- educação;
- cultura e PNAB;
- estradas rurais, UPAs, veículos e eventos LPR;
- votações, candidatos, eleitores e auditoria;
- configurações do sistema e audit logs.

### 8.2 Redis

Redis sustenta filas e processamento assíncrono. Antes de copiar sua persistência, o backup solicita `BGSAVE` e copia `/data`.

### 8.3 Uploads e arquivos

Uploads persistentes ficam no volume montado em:

```text
/data/apicemiterio
```

O runtime também fornece:

```text
assets/backend-public
assets/backend-private
assets/frontend-build
assets/mapaturistico-public
```

Banco restaurado sem uploads produz registros com imagens quebradas. Sempre trate dump e arquivos como uma unidade de recuperação.

## 9. Publicação pelo Nginx

Domínio principal: `api.garca.sp.gov.br`.

Rotas relevantes:

| Prefixo | Destino |
|---|---|
| `/api/`, `/health`, `/readyz`, `/stats` | API Express |
| `/garcapet`, `/sama`, `/semit-a-pet` | assets do backend |
| `/garca-cidadao` | frontend GovCidadão |
| `/garca-cidadao-api/` | API GovCidadão |
| `/ferramentas` | Caixa de Ferramentas |
| `/tv/`, `/tv-semit/` | container `tv-semit:3050` |
| `/servicos/`, `/agendamentos/`, `/formularios/`, `/iluminacao/` | builds web publicados |
| `/rotas-rurais/` | frontend de Estradas Rurais |
| `/ordem-servicos/` | portal Ordem de Serviços |
| `/votacao/` | módulo de votação |
| `/semittv/`, `/xibo/` e rotas Xibo | `10.15.25.29` |
| `/painel-senhas/`, `/painel/`, `/triagem/`, `/senhas/`, `/sga/` | `10.15.25.31` |

Portas publicadas pelo Nginx: `80`, `443`, `8080`, `8082`, `8088` e `8090`. Não modificar os proxies de `.29` e `.31` sem coordenar com os responsáveis por esses servidores.

Para Estradas Rurais, o build deve referenciar assets sob `/rotas-rurais/static/`. A regra Nginx correspondente usa alias para `/usr/share/nginx/html/static/`. Se o `index.html` apontar para `/static/`, a requisição pode receber o HTML de fallback em vez de JavaScript/CSS e a aplicação React ficará vazia.

## 10. Segredos e configuração

Nunca escrever valores secretos neste documento.

Locais efetivos:

```text
/home/semit/runtime/api-gestao-publica/secrets/production.env
/home/semit/runtime/api-gestao-publica/secrets/backend.env
/home/semit/.config/api-gestao-publica/upa-rural-service-account.json
```

`.env` da raiz e `backend/.env` podem ser links simbólicos. Exemplos versionados documentam somente nomes e formatos.

Categorias de configuração:

- MongoDB e Redis;
- JWT, cookies, CORS, proxy e rate limit;
- SMTP e remetente;
- WhatsApp/Evolution;
- Firebase/UPA Rural;
- Sentry;
- Gemini e Groq;
- URLs públicas, diretórios de upload e alertas operacionais.

Ao migrar de servidor, revisar caminhos absolutos no arquivo de produção. O script de restore reescreve o prefixo conhecido do runtime, mas não valida semanticamente serviços externos.

## 11. Dependências externas

| Dependência | Uso | Falha esperada se indisponível |
|---|---|---|
| DNS de `api.garca.sp.gov.br` | entrada pública | portal inacessível pelo domínio |
| Let's Encrypt | HTTPS | certificado vencido/renovação falha |
| SMTP | e-mails e recuperação de senha | mensagens ficam pendentes/falham |
| Evolution/WhatsApp | notificações | avisos não enviados |
| Firebase | Estradas Rurais | dados RTDB e autenticação rural falham |
| Intelbras LPR | leitura de placas | eventos rurais deixam de chegar |
| Sentry | observabilidade | perda de telemetria, sem derrubar a API |
| Gemini/Groq | recursos de IA | funcionalidades dependentes ficam indisponíveis |
| `10.15.25.29` | Xibo | TV/layouts/campanhas incompletos |
| `10.15.25.31` | senhas/Novo SGA | painel e triagem indisponíveis |

## 12. TV corporativa

Container: `tv-semit`, porta `3050`, dados em `/app/data`.

Fontes conhecidas:

```text
/home/semit/Documentos/api-semit/tv_corporativa
/home/semit/Documentos/semit_tv_app
/home/semit/Documentos/semit_tv_native
```

Health endpoint real:

```text
http://127.0.0.1:3050/api/health
```

Diagnóstico observado em 26/08/2026:

- a aplicação responde HTTP 200 e informa versão `1.2.0`;
- o healthcheck do container usa `localhost`, resolvido como IPv6 `::1`;
- a aplicação escuta em IPv4, causando falso `unhealthy`;
- `Garça Feed` envia heartbeat HTTP 200;
- o display `SEMIT TV - SEMIT` aguarda autorização no Xibo e recebe HTTP 500 na sincronização.

Esses dois problemas são independentes: corrigir o healthcheck não autoriza o display no Xibo.

## 13. Monitoramento e saúde

Endpoints principais:

```text
GET /health   # processo da API
GET /readyz   # prontidão e dependências
GET /stats    # estatísticas/métricas da aplicação
```

Prometheus: `http://10.15.25.28:9090`.

Grafana: `http://10.15.25.28:3001`.

Cron de uptime: a cada 10 minutos, usando `scripts/uptime-check.sh`.

Diagnóstico inicial seguro:

```bash
cd /home/semit/Documentos/api-gestao-publica
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
docker compose ps
curl -fsS http://127.0.0.1:5000/health
curl -fsS http://127.0.0.1:5000/readyz
docker logs --tail 200 api
```

Consultar `docs/RUNBOOK-INCIDENTES.md` antes de reiniciar componentes.

## 14. Backup diário

Agendamento observado:

```text
01:15 diariamente
```

Diretório:

```text
/home/semit/Documentos/backups-completos/YYYY-MM-DD_HH-MM-SS/
```

Retenção padrão: 14 dias. A cópia externa é feita manualmente e deve ser validada por SHA-256.

Conteúdo esperado:

- projeto e código efetivo da API;
- MongoDB;
- Redis;
- uploads;
- frontend e Nginx;
- TLS;
- segredos dereferenciados;
- runtime;
- imagens Docker;
- TV corporativa, seu volume, configuração e fontes;
- volumes Grafana e Prometheus;
- volumes auxiliares Certbot/Mongo;
- inventário e manifesto.

Scripts:

```text
backup_completo.sh
scripts/backup-diario.sh
scripts/verificar-backup.sh
scripts/publicar-backup-transferencia.sh
scripts/teste-restore-homologacao.sh
```

Verificação manual:

```bash
cd /home/semit/Documentos/api-gestao-publica
BASE_DIR=/home/semit/Documentos/backups-completos bash scripts/verificar-backup.sh
```

## 15. Recuperação em outro servidor

Documento normativo: `docs/RESTORE-BACKUP.md`.

Pré-requisitos:

- Linux com espaço suficiente;
- Docker Engine e plugin Compose;
- `rsync`, `gzip`, `tar`, `sha256sum` e acesso administrativo;
- pasta completa do backup, incluindo payload, imagens, hashes, manifesto e log;
- endereços/regras de rede para `.29`, `.31` e integrações externas.

Sequência resumida:

1. conferir SHA-256;
2. extrair `full/`;
3. executar `scripts/restore-host-novo.sh` com autorização explícita;
4. restaurar Mongo, Redis, uploads, TLS e volumes complementares;
5. carregar imagens e subir a stack;
6. validar API, frontends, TV, Grafana e Prometheus;
7. revisar DNS e HTTPS;
8. validar integrações externas e fluxos de negócio.

O script recusa executar no hostname de produção `SEMIT`, salvo liberação deliberada por variável específica.

## 16. Deploy e atualização

Preferir deploy seletivo:

```bash
cd /home/semit/Documentos/api-gestao-publica
./scripts/deploy-seletivo.sh api email-worker job-worker
```

Rebuild completo:

```bash
./rebuild.sh
```

Uma parada geral somente deve ocorrer quando solicitada explicitamente com `FULL_STACK_DOWN=1`.

Antes de qualquer deploy:

1. confirmar diretório e Compose efetivos;
2. conferir `git status` e preservar alterações locais;
3. gerar/verificar backup recente;
4. registrar imagens e estado dos containers;
5. planejar rollback;
6. atualizar apenas serviços em escopo;
7. validar `/health`, `/readyz` e fluxos afetados.

### Publicação segura do frontend estático

Procedimento validado em 27/08/2026:

1. confirmar que a fonte versionada está limpa e sincronizada;
2. instalar dependências conforme o lockfile; atualmente o frontend exige `npm ci --legacy-peer-deps` por conflito de peer dependency entre React 19 e `@emoji-mart/react`;
3. executar testes dirigidos dos módulos afetados;
4. gerar novo `frontend/build` com `npm run build`;
5. conferir que o build informa hospedagem em `/rotas-rurais/` e que o `index.html` referencia `/rotas-rurais/static/js/` e `/rotas-rurais/static/css/`;
6. validar sintaxe do bundle principal e existência de todos os assets referenciados;
7. criar cópia integral do build atualmente montado pelo Nginx;
8. copiar primeiro os novos assets sem excluir os antigos, preservando sessões abertas;
9. substituir `index.html` por rename atômico somente depois dos assets;
10. testar conteúdo e MIME de HTML, JavaScript, CSS e imagens;
11. validar em navegador o fluxo afetado e pelo menos um fluxo principal não relacionado;
12. conferir saúde dos containers e manter o rollback até o encerramento da observação.

Não é necessário reiniciar Nginx, API, MongoDB ou Redis para substituir apenas arquivos estáticos. Não usar sincronização com exclusão enquanto houver clientes com a versão anterior aberta.

## 17. Testes e qualidade

Ferramentas existentes:

- Jest/Supertest no backend;
- Pytest no GovCidadão;
- Playwright em `e2e/`;
- k6 em `k6/`;
- testes Flutter;
- smoke tests da Caixa de Ferramentas;
- teste de restauração Mongo em homologação.

Comandos são encapsulados pelos scripts:

```text
scripts/run-gov-pytest.sh
scripts/run-playwright.sh
scripts/run-k6.sh
scripts/teste-restore-homologacao.sh
```

Não assuma que a existência de testes significa cobertura integral. Mudanças em autenticação, votação, LGPD, uploads e restauração exigem validação dirigida.

## 18. Segurança e LGPD

Controles observados:

- Helmet, CORS, rate limit e sanitização;
- JWT e cookies configuráveis;
- trilha de auditoria;
- papéis e autorização por módulo;
- logs e retenção de auditoria;
- backups com permissões restritas;
- segredos fora do Git.

Regras obrigatórias:

- não enviar `.env`, service accounts ou backups para Git;
- não registrar tokens, senhas ou dados pessoais em logs;
- criptografar e controlar acesso à cópia externa;
- aplicar menor privilégio;
- seguir `docs/GOV-LGPD.md`, `docs/FASE4-LGPD.md` e `docs/ROTACAO-SECRETS.md`;
- registrar ações administrativas e incidentes relevantes.

## 19. Automações agendadas

| Frequência | Tarefa |
|---|---|
| A cada 10 min | uptime check da API |
| Diariamente, 01:15 | backup completo |
| Domingo, 03:45 | retenção de logs de auditoria |

Logs operacionais ficam em `backups-completos/_logs/`.

## 20. Situações comuns

### API fora do ar

1. testar `/health` e `/readyz` localmente;
2. conferir `docker ps`;
3. ler logs da API, Mongo e Redis;
4. verificar disco e memória;
5. não reiniciar toda a stack sem identificar o componente.

### Portal abre, mas imagens falham

1. conferir o volume `apicemiterio_data`;
2. conferir mounts do `api` e `nginx`;
3. testar `/images/`;
4. validar permissões dos arquivos.

### E-mails não chegam

1. conferir `email-worker`;
2. verificar fila/Redis;
3. testar conectividade SMTP sem expor credenciais;
4. procurar falhas nos logs do worker.

### TV aparece `unhealthy`

1. testar `127.0.0.1:3050/api/health` dentro do container;
2. conferir se o healthcheck usa `localhost`/IPv6;
3. separar falha do player de falha de autorização Xibo;
4. conferir logs e estado do display no servidor `.29`.

### Painel de senhas falha

1. testar conectividade com `10.15.25.31`;
2. conferir rotas Nginx correspondentes;
3. diagnosticar a aplicação no servidor `.31`;
4. não procurar banco/código do painel no backup deste servidor.

### Estradas Rurais abre somente cabeçalho e rodapé

Diagnóstico registrado em 27/08/2026:

1. confirmar que `/api/rotas-rurais/map/properties/search` responde; isso separa falha da API de falha visual;
2. conferir o hash do bundle referenciado pelo `index.html` efetivamente montado no container `nginx`;
3. verificar se JavaScript e CSS retornam seus MIME corretos, e não `text/html` de fallback;
4. confirmar que o build publicado contém as rotas `/rotas-rurais/login`, `/proprietario`, `/operador`, `/admin` e `/mapa`;
5. testar `/rotas-rurais/banner-estradas.png`;
6. comparar `/home/semit/Documentos/api-gestao-publica/frontend/build` com `/home/semit/Documentos/api-semit/frontend/build`;
7. seguir o procedimento de publicação estática segura da seção 16.

Ocorrência de 27/08/2026: o Nginx servia um build de 31/07/2026 pelo checkout `api-semit`, enquanto a fonte e o build mais recentes estavam em `api-gestao-publica`. Uma primeira cópia revelou também que o build antigo apontava para `/static/`, retornando HTML no lugar do JavaScript. O frontend foi recompilado a partir da fonte versionada, 16 testes rurais passaram e a publicação final passou a usar o bundle `main.cb40049b.js` sob `/rotas-rurais/static/`.

Evidências da validação final:

- login rural renderizado com e-mail, senha, entrada e cadastro;
- mapa com o título “Mapa dos bairros rurais de Garça”;
- banner, JavaScript, API e HTML respondendo `200` com tipos corretos;
- login principal do Memorial renderizado sem erro de console;
- API, MongoDB, Redis e GovCidadão saudáveis;
- Nginx aprovado em teste de configuração;
- nenhum container foi reiniciado;
- rollback preservado em `/home/semit/Documentos/deploy-rollbacks/frontend-build-before-rural-20260827-080655`.

## 21. Riscos e dívidas técnicas conhecidas

1. `docs/FONTE-CANONICA.md` diverge da stack efetiva.
2. A TV pertence a um checkout diferente da stack principal.
3. O healthcheck da TV usa `localhost` e falha por IPv6.
4. O display `SEMIT TV - SEMIT` aguarda autorização no Xibo e registra HTTP 500.
5. Xibo e painel de senhas dependem de servidores cujo backup não pertence a esta rotina.
6. Existem containers antigos/indeterminados que precisam de classificação formal.
7. O repositório possui arquivos de backup e mudanças locais; limpeza deve ser controlada.
8. A recuperação completa atualizada precisa ser testada periodicamente em host isolado.
9. Os binds de frontend, arquivos públicos e configuração do Nginx ainda apontam para `api-semit`, apesar de a fonte principal estar em `api-gestao-publica`.
10. O frontend usa React 19 com dependência que declara suporte somente até React 18; a instalação reproduzível exige `--legacy-peer-deps` até a compatibilidade ser resolvida.
11. O build registra avisos ESLint e o Node.js 18 é inferior ao requisito declarado pelo React Router 7; atualizar runtime e dependências exige homologação própria.

## 22. Checklist de continuidade

### Diário

- [ ] backup das 01:15 concluído;
- [ ] verificador sem falhas;
- [ ] API e dependências saudáveis;
- [ ] espaço em disco adequado.

### Semanal

- [ ] confirmar cópia externa e SHA-256;
- [ ] revisar alertas Grafana/Prometheus;
- [ ] revisar filas e erros de workers;
- [ ] verificar renovação TLS;
- [ ] revisar erros repetitivos da TV/Xibo.

### Trimestral

- [ ] restaurar em ambiente isolado;
- [ ] medir RPO e RTO reais;
- [ ] validar login, uploads, e-mail, TV e monitoramento;
- [ ] revisar acessos e segredos;
- [ ] atualizar este mapa e os runbooks.

## 23. Índice de documentos

| Documento | Finalidade |
|---|---|
| `README.md` | introdução do projeto |
| `FUNCIONALIDADES_DO_SISTEMA.md` | catálogo funcional |
| `docs/RESTORE-BACKUP.md` | restauração de desastre |
| `docs/RESTORE-BACKUP-LOG.md` | histórico de testes de restore |
| `docs/RUNBOOK-INCIDENTES.md` | resposta a incidentes |
| `docs/MANUTENCAO-DISCO.md` | capacidade e limpeza segura |
| `docs/ROTACAO-SECRETS.md` | rotação de credenciais |
| `docs/GOV-LGPD.md` | governança LGPD |
| `docs/FASE4-LGPD.md` | controles LGPD |
| `docs/FASE6-AUDITORIA-OPS.md` | auditoria e operação |
| `docs/PLAYWRIGHT-E2E.md` | testes ponta a ponta |
| `docs/PORTAL-SERVICOS-WEB.md` | builds e publicação web |
| `backend/docs/AGENDA_GARCA_API.md` | contrato inicial, identidade e segurança da Agenda Garça |
| `docs/FONTE-CANONICA.md` | histórico da fonte; possui divergência conhecida |

## 24. Comandos de consulta segura

```bash
cd /home/semit/Documentos/api-gestao-publica

# Estado geral
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
docker compose ps

# Fonte realmente usada
docker inspect api -f '{{index .Config.Labels "com.docker.compose.project.working_dir"}}'
docker inspect api -f '{{index .Config.Labels "com.docker.compose.project.config_files"}}'

# Saúde
curl -fsS http://127.0.0.1:5000/health
curl -fsS http://127.0.0.1:5000/readyz

# Volumes e mounts
docker volume ls
docker inspect api -f '{{json .Mounts}}'

# Backup
bash scripts/verificar-backup.sh
```

Esses comandos são de leitura. Comandos de restore, exclusão, rotação de segredos, rebuild ou alteração de banco devem seguir autorização e runbook.

## 25. A ser implementado — Plano de proteção e segurança

### 25.1 Objetivo e regras de execução

Objetivo: reduzir a superfície de ataque sem interromper os serviços municipais, proteger dados pessoais e permitir rollback rápido.

Regras para toda implementação:

1. executar primeiro em homologação ou clone isolado;
2. confirmar backup recente, hash e cópia externa;
3. registrar estado anterior, arquivos e imagens Docker;
4. mudar um domínio de risco por vez;
5. validar healthchecks e fluxos de negócio;
6. manter rollback documentado e testado;
7. não registrar segredos em Git, logs ou neste documento;
8. atualizar este plano ao concluir cada item.

Estados permitidos para acompanhamento:

- `[ ]` pendente;
- `[~]` em implementação;
- `[x]` concluído e validado;
- `[!]` bloqueado, com justificativa registrada.

### 25.2 Fase 0 — Preparação e linha de base

Prazo recomendado: antes de qualquer correção.

- [ ] Designar responsável técnico e aprovador para mudanças de segurança.
- [ ] Criar inventário oficial de domínios, IPs, portas, containers, imagens, volumes e integrações.
- [ ] Classificar `api-fin` e `intelligent_elbakyan` como ativos, legados ou removíveis.
- [ ] Confirmar proprietários e backup dos servidores `10.15.25.29` e `10.15.25.31`.
- [ ] Resolver documentalmente qual checkout é canônico para a stack e para a TV.
- [ ] Registrar testes funcionais mínimos para API, login, uploads, e-mail, votação, TV, painel de senhas e monitoramento.
- [ ] Gerar relatório inicial de vulnerabilidades de dependências e imagens.
- [ ] Definir janelas de manutenção e contatos para incidentes.

Critério de aceite: inventário conferido contra o ambiente real e teste de restore recente registrado.

### 25.3 Fase 1 — Contenção imediata da TV corporativa

Prioridade: crítica.

- [ ] Remover a publicação direta de `3050` em todas as interfaces; manter acesso apenas pela rede Docker/Nginx ou bind local.
- [ ] Criar autenticação obrigatória para operações administrativas da TV.
- [ ] Separar rotas públicas de leitura das rotas administrativas de escrita.
- [ ] Proteger criação/exclusão de displays, configuração, registro Xibo, sincronização manual e playlists.
- [ ] Aplicar autorização por papel e trilha de auditoria nas alterações.
- [ ] Adicionar rate limit para login, sincronização e operações administrativas.
- [ ] Validar entrada e tamanho de todos os payloads.
- [ ] Alterar o healthcheck para `127.0.0.1:3050/api/health`.
- [ ] Executar o container como usuário não-root.
- [ ] Autorizar corretamente o display `SEMIT TV - SEMIT` no Xibo e investigar o HTTP 500.

Critérios de aceite:

- chamadas administrativas sem credencial retornam `401` ou `403`;
- a porta `3050` não está exposta fora do caminho aprovado;
- healthcheck fica saudável;
- playlist e displays continuam funcionando;
- eventos administrativos aparecem na auditoria.

Rollback: restaurar imagem e Compose anteriores, mantendo o volume `api-semit_tv-semit-data` intacto.

### 25.4 Fase 2 — Proteção de MongoDB e Redis

Prioridade: alta.

- [ ] Criar credenciais exclusivas para MongoDB e habilitar `authorization`.
- [ ] Criar usuários separados por aplicação e menor privilégio quando tecnicamente viável.
- [ ] Atualizar URIs da API, workers, GovCidadão e ferramentas sem expor valores.
- [ ] Configurar autenticação no Redis com segredo forte.
- [ ] Atualizar todos os clientes Redis e validar filas existentes.
- [ ] Restringir MongoDB e Redis exclusivamente à rede Docker necessária.
- [ ] Rotacionar credenciais após validação.
- [ ] Garantir que backup e restore funcionem com autenticação habilitada.
- [ ] Documentar recuperação de credenciais por procedimento administrativo seguro.

Critérios de aceite:

- conexão sem credencial é recusada;
- API e workers ficam saudáveis;
- dumps e restores autenticados passam em homologação;
- nenhuma credencial aparece em logs ou no Git.

Rollback: reverter configuração de autenticação e arquivos de ambiente a partir da cópia protegida, sem recriar volumes.

### 25.5 Fase 3 — Uploads e conteúdo fornecido por usuários

Prioridade: alta.

- [ ] Validar o tipo real do arquivo por assinatura, não apenas pelo MIME enviado pelo cliente.
- [ ] Gerar extensão do arquivo a partir do tipo validado; nunca conservar extensão arbitrária.
- [ ] Rejeitar HTML, SVG ativo, scripts, executáveis e formatos não previstos.
- [ ] Reprocessar imagens com biblioteca segura para remover metadados e conteúdo inesperado.
- [ ] Manter limites de tamanho, dimensões, quantidade e frequência.
- [ ] Servir uploads em origem sem cookies ou com `Content-Disposition` e `nosniff` adequados.
- [ ] Impedir execução de arquivos no diretório de uploads.
- [ ] Aplicar antivírus/antimalware quando houver documentos ou arquivos complexos.
- [ ] Criar testes para MIME falso, dupla extensão, path traversal, arquivo poliglota e volume abusivo.

Critério de aceite: arquivos forjados são rejeitados e imagens legítimas continuam funcionando em todos os módulos.

### 25.6 Fase 4 — Rede, firewall e acessos administrativos

Prioridade: alta.

- [ ] Definir política de firewall local com negação por padrão.
- [ ] Liberar publicamente somente `80` e `443`, conforme necessidade institucional.
- [ ] Restringir SSH `22` a IPs administrativos ou VPN.
- [ ] Restringir Grafana `3001` e Prometheus `9090` à rede administrativa.
- [ ] Revisar a necessidade de `8080`, `8082`, `8088`, `8090`, `7070` e `56654`.
- [ ] Restringir ou remover portas RustDesk não necessárias.
- [ ] Instalar proteção contra tentativas repetidas de SSH, como Fail2ban ou controle equivalente.
- [ ] Desativar autenticação SSH por senha, root remoto e `X11Forwarding` se não forem necessários.
- [ ] Manter autenticação por chave e revisar chaves autorizadas periodicamente.
- [ ] Auditar membros dos grupos `sudo` e `docker`.
- [ ] Registrar regras equivalentes no firewall externo da rede municipal.

Critérios de aceite:

- varredura de rede mostra apenas portas aprovadas;
- acesso administrativo continua disponível pelos caminhos autorizados;
- regras persistem após reinicialização;
- existe acesso de emergência testado antes da aplicação das regras.

Rollback: console local ou acesso fora de banda com restauração do conjunto anterior de regras.

### 25.7 Fase 5 — Dependências, imagens e sistema operacional

Prioridade: alta, com implantação controlada.

- [ ] Separar dependências de runtime das dependências apenas de build/desenvolvimento.
- [ ] Atualizar primeiro vulnerabilidades críticas e altas alcançáveis.
- [ ] Revisar `nodemailer`, `axios`, `react-router`, `react-scripts`, `tar`, `mongoose`, `multer` e `express-rate-limit`.
- [ ] Reconstruir imagens com lockfiles atualizados e bases suportadas.
- [ ] Escanear imagens Docker e gerar SBOM por release.
- [ ] Fixar imagens por versão ou digest; evitar atualização implícita.
- [ ] Atualizar pacotes de segurança do Debian, kernel, Docker e Compose em janela própria.
- [ ] Reiniciar o host quando a atualização do kernel exigir.
- [ ] Executar testes Jest, Pytest, Playwright, smoke e fluxos manuais antes de promover.
- [ ] Criar rotina periódica de auditoria de dependências com alerta, sem `fix --force` automático em produção.

Critério de aceite: nenhuma vulnerabilidade crítica alcançável e plano registrado para altas remanescentes.

### 25.8 Fase 6 — Endurecimento dos containers

Prioridade: média/alta.

- [ ] Executar `tv-semit`, `ferramentas`, `govcidadao-api` e `govcidadao-frontend` como não-root.
- [ ] Ativar filesystem somente leitura onde possível.
- [ ] Criar mounts graváveis exclusivos para dados temporários necessários.
- [ ] Remover capabilities Linux e adicionar somente as indispensáveis.
- [ ] Ativar `no-new-privileges`.
- [ ] Manter seccomp/AppArmor ou controle equivalente.
- [ ] Definir limites de memória, CPU e processos para todos os serviços.
- [ ] Configurar healthchecks coerentes com cada aplicação.
- [ ] Impedir acesso ao socket Docker e mounts desnecessários.
- [ ] Separar redes Docker por função, reduzindo comunicação lateral.

Critério de aceite: serviços iniciam sem root, respeitam limites e acessam somente dependências necessárias.

### 25.9 Fase 7 — Autenticação, autorização e sessões

Prioridade: alta.

- [ ] Elevar o mínimo real de senha para pelo menos 12 caracteres ou adotar passphrases.
- [ ] Corrigir a divergência entre comentário e implementação da política de senha.
- [ ] Implementar MFA para administradores e perfis sensíveis.
- [ ] Armazenar somente hash dos tokens de redefinição de senha.
- [ ] Invalidar sessões após troca de senha, mudança de papel ou incidente.
- [ ] Definir TTL, rotação e revogação para refresh tokens.
- [ ] Substituir API keys globais por credenciais individuais com escopo, expiração e auditoria.
- [ ] Usar comparação segura para segredos de webhook/API keys.
- [ ] Aplicar middleware de papel diretamente nas rotas sensíveis, mantendo validação adicional no controller.
- [ ] Construir matriz de permissões por perfil e testes negativos automatizados.
- [ ] Revisar rotas públicas documentadas no OpenAPI.

Critérios de aceite:

- testes comprovam que usuário comum não executa ações administrativas;
- tokens e chaves possuem ciclo de vida controlado;
- MFA funciona para administradores;
- OpenAPI descreve corretamente os requisitos de segurança.

### 25.10 Fase 8 — Nginx, navegador e proxies externos

Prioridade: média/alta.

- [ ] Eliminar o drift entre o Nginx montado de `api-semit` e o projeto `api-gestao-publica`.
- [ ] Consolidar e versionar a configuração efetivamente publicada.
- [ ] Adicionar Content Security Policy compatível com cada frontend.
- [ ] Adicionar Permissions Policy e revisar `frame-ancestors`.
- [ ] Manter TLS 1.2/1.3, HSTS, `nosniff`, política de referência e ocultamento de versão.
- [ ] Reduzir `client_max_body_size` por rota ao mínimo funcional.
- [ ] Aplicar rate limit no Nginx para endpoints de maior risco quando adequado.
- [ ] Revisar redirecionamentos e rotas administrativas encaminhadas a `.29` e `.31`.
- [ ] Garantir autenticação no upstream ou no proxy para painel de senhas, Xibo e administração.
- [ ] Definir timeouts e limites de resposta para upstreams externos.

Critério de aceite: teste de configuração passa, frontends funcionam com CSP e nenhuma rota administrativa fica exposta sem controle.

### 25.11 Fase 9 — Cloudflare e proteção da borda pública

Prioridade: alta.

Objetivo: colocar uma camada externa de proteção diante do portal e da API pública, sem transformar a Cloudflare em substituta do firewall, da autenticação ou das correções internas da aplicação.

Diretriz de contratação:

- iniciar a implantação controlada no plano Free para validar DNS, proxy, TLS e compatibilidade;
- adotar o plano Pro como referência mínima recomendada para a operação pública institucional;
- avaliar o plano Business somente se suporte, SLA, regras avançadas ou exigências institucionais justificarem o custo;
- usar Cloudflare Zero Trust/Access para painéis administrativos; verificar a franquia gratuita e os preços vigentes antes da contratação;
- registrar preços, impostos, câmbio, responsável pela conta, forma de pagamento e data de renovação no inventário administrativo, sem guardar dados de cobrança neste documento.

Escopo de implementação:

- [ ] Confirmar titularidade do domínio, registrador, conta institucional e responsáveis autorizados.
- [ ] Exportar e conferir toda a zona DNS antes de alterar nameservers.
- [ ] Reduzir antecipadamente o TTL e definir janela de implantação e rollback.
- [ ] Migrar os registros DNS sem remover entradas de e-mail, SPF, DKIM, DMARC ou integrações existentes.
- [ ] Ativar o proxy da Cloudflare somente para os hostnames HTTP/HTTPS públicos aprovados.
- [ ] Manter MongoDB, Redis, SSH, Grafana, Prometheus, TV administrativa, painel de senhas e demais portas internas fora da exposição pública.
- [ ] Configurar TLS no modo `Full (strict)` com certificado válido também no servidor de origem.
- [ ] Ativar proteção DDoS, regras WAF gerenciadas aplicáveis, proteção contra bots e limites de requisição por endpoint.
- [ ] Aplicar limites específicos a login, recuperação de senha, cadastro, uploads, pesquisas, exportações e APIs de escrita.
- [ ] Implantar Cloudflare Turnstile, com validação obrigatória no servidor, nos formulários sujeitos a abuso.
- [ ] Proteger Grafana e outros painéis web administrativos com Cloudflare Access/Zero Trust, MFA e política de menor privilégio, quando o fluxo institucional permitir.
- [ ] Configurar Nginx e a aplicação para confiar no IP do cliente somente por cabeçalhos enviados por proxies Cloudflare validados.
- [ ] Preservar `CF-Connecting-IP`/cadeia de proxy corretamente para auditoria e rate limit, sem aceitar cabeçalhos forjados em acesso direto.
- [ ] Restringir no firewall de origem as portas `80` e `443` aos endereços oficiais da Cloudflare e aos caminhos administrativos expressamente aprovados.
- [ ] Automatizar ou documentar a atualização segura das faixas de IP oficiais da Cloudflare.
- [ ] Bloquear o acesso direto ao IP de origem e testar que ele não contorna WAF, autenticação ou limites.
- [ ] Impedir cache de respostas autenticadas, dados pessoais, APIs de escrita e conteúdo administrativo.
- [ ] Definir cache apenas para conteúdo público estático e testar invalidação após publicação.
- [ ] Ativar logs e alertas de eventos de segurança, preservando dados mínimos necessários e a retenção aprovada.
- [ ] Documentar recuperação da conta, MFA, responsáveis, tokens de API com escopo mínimo e procedimento de emergência.
- [ ] Criar runbook de ativação, validação, rollback de nameservers e operação durante indisponibilidade do provedor.
- [ ] Revisar termos, tratamento de dados, localização de logs e requisitos de LGPD antes da produção.

Critérios de aceite:

- portal e API funcionam pelo domínio com TLS válido e sem regressão nos fluxos essenciais;
- acesso direto ao IP de origem não permite contornar a Cloudflare;
- somente hostnames e portas aprovados estão publicados;
- IP real do cliente aparece corretamente nos logs e controles de abuso;
- login, uploads, TV, painel de senhas e integrações continuam funcionando;
- regras de teste bloqueiam requisições maliciosas sem bloquear o uso legítimo;
- conta institucional possui MFA, pelo menos dois responsáveis e recuperação documentada;
- existe evidência de rollback testado e de exportação da zona DNS.

Rollback: manter exportação da zona anterior, valores de TTL, configuração de origem e sequência documentada para restaurar os nameservers/registros. Não remover certificado nem proteção local do servidor durante a implantação.

Observação: Cloudflare não corrige APIs sem autenticação, bancos sem credenciais, uploads inseguros, dependências vulneráveis, portas administrativas abertas ou backups sem criptografia. Esses controles continuam obrigatórios nas demais fases.

### 25.12 Fase 10 — Logs, auditoria e disponibilidade

Prioridade: média/alta.

- [ ] Configurar rotação `json-file` ou driver centralizado para todos os containers.
- [ ] Definir tamanho, quantidade e retenção dos logs.
- [ ] Remover ou mascarar dados pessoais, tokens e credenciais dos logs.
- [ ] Criar alertas para autenticação anômala, mudança de papel, exclusão, exportação e falhas repetidas.
- [ ] Alertar sobre disco, memória, CPU, filas, expiração TLS, backup e indisponibilidade de `.29`/`.31`.
- [ ] Monitorar crescimento dos volumes e do diretório de uploads.
- [ ] Sincronizar horário do host e preservar timestamps de auditoria.
- [ ] Restringir acesso ao Grafana e proteger a configuração do Prometheus.
- [ ] Criar runbook para indisponibilidade e esgotamento de recursos.

Critério de aceite: logs não crescem indefinidamente, alertas são recebidos e um evento de teste pode ser rastreado ponta a ponta.

### 25.13 Fase 11 — Backup, segredos e recuperação

Prioridade: alta.

- [ ] Criptografar o pacote destinado à cópia externa com ferramenta e chave institucionais.
- [ ] Manter a chave de recuperação separada do servidor e do backup.
- [ ] Registrar recebimento externo por hash, data, tamanho e responsável.
- [ ] Definir retenção, descarte seguro e controle de acesso.
- [ ] Garantir que logs e manifestos não exponham valores secretos.
- [ ] Rotacionar credenciais se uma cópia perder cadeia de custódia.
- [ ] Testar trimestralmente o restore completo em servidor isolado.
- [ ] Validar no restore Mongo autenticado, Redis, uploads, TV, Grafana, Prometheus e TLS.
- [ ] Medir e registrar RPO/RTO reais.
- [ ] Criar backup próprio e restore dos servidores `.29` e `.31`.
- [ ] Manter uma geração offline ou imutável contra ransomware.

Critérios de aceite:

- pacote externo não pode ser lido sem a chave;
- hashes conferem;
- restore completo passa;
- chave de recuperação está disponível a pelo menos dois responsáveis autorizados.

### 25.14 Fase 12 — Governança e validação contínua

Prioridade: contínua.

- [ ] Criar política de atualização e correção por criticidade.
- [ ] Revisar acessos administrativos trimestralmente.
- [ ] Rotacionar segredos e chaves conforme criticidade e eventos.
- [ ] Realizar análise estática, dependências, imagens e testes de segurança no fluxo de entrega.
- [ ] Impedir commit de segredos com scanner automatizado.
- [ ] Executar teste de invasão autorizado em homologação após as fases prioritárias.
- [ ] Fazer exercício anual de incidente e desastre.
- [ ] Manter inventário de dados pessoais, finalidade, retenção e base legal.
- [ ] Atualizar documentação, diagramas e matriz de permissões a cada release relevante.
- [ ] Registrar exceções de segurança com risco aceito, responsável e data de revisão.

### 25.15 Ordem consolidada

| Ordem | Entrega | Prioridade | Dependência principal |
|---:|---|---|---|
| 1 | Proteger API e porta da TV | Crítica | backup e teste funcional da TV |
| 2 | Autenticar MongoDB e Redis | Alta | inventário de clientes e segredos |
| 3 | Corrigir uploads | Alta | testes de todos os módulos com imagem |
| 4 | Restringir portas e SSH | Alta | acesso de emergência |
| 5 | Atualizar dependências e sistema | Alta | homologação e rollback |
| 6 | Criptografar backup externo | Alta | gestão institucional de chaves |
| 7 | Melhorar autenticação e sessões | Alta | matriz de permissões |
| 8 | Endurecer containers | Média/alta | testes por serviço |
| 9 | Implantar Cloudflare e bloquear bypass da origem | Alta | domínio, DNS, firewall e rollback |
| 10 | Consolidar Nginx e headers | Média/alta | eliminar drift de fonte |
| 11 | Logs, alertas e limites | Média/alta | capacidade e retenção |
| 12 | Governança e testes recorrentes | Contínua | responsáveis definidos |

### 25.16 Evidências obrigatórias por item concluído

Para marcar `[x]`, anexar ou referenciar:

- data e responsável;
- arquivos, imagens e serviços alterados;
- resultado de testes positivos e negativos;
- evidência de que segredos não foram expostos;
- resultado de healthchecks;
- plano de rollback testado;
- ocorrências observadas após a implantação;
- atualização do inventário e deste mapa.

## 26. Manutenção deste mapa

Atualizar este documento quando ocorrer qualquer um destes eventos:

- mudança do servidor, domínio ou diretório canônico;
- inclusão ou remoção de container;
- novo banco, volume ou integração;
- mudança de backup/restore;
- alteração relevante de Nginx;
- mudança de papéis ou dados pessoais tratados;
- teste de desastre com novas descobertas.

Registrar no topo a data da observação e manter valores secretos fora do arquivo.

## 27. Em implementação — Agenda Garça

### 27.1 Decisão de arquitetura

O novo sistema de agendamentos será construído como um módulo da plataforma, inspirado nos fluxos de produtos como Zoho Bookings, sem criar uma identidade paralela.

Arquitetura aprovada:

```text
React web ───────┐
                 ├──> API Express `/api/agenda` ──> MongoDB + Redis + workers
Flutter mobile ──┘                  |
                                    └──> coleção central `users`
```

Regras invioláveis de identidade:

1. `User`/coleção `users` é a única fonte oficial de cadastro e autenticação;
2. cadastro, login, verificação de e-mail, recuperação de senha e desativação continuam nos endpoints centrais `/users`;
3. React e Flutter usam o mesmo JWT emitido pela API principal;
4. nenhuma senha, hash, CPF ou conta de login será criada em coleções da Agenda;
5. agendamentos referenciam obrigatoriamente `User._id` obtido do token validado, nunca um `userId` confiado ao cliente;
6. permissões da Agenda são vínculos ao usuário central, com unidade, papel, concessor e auditoria;
7. uma pessoa desativada na base central perde acesso ao módulo em todos os clientes;
8. snapshots mínimos de nome/e-mail/telefone podem ser preservados no agendamento para integridade histórica, mas não constituem nova identidade;
9. Firebase deixa de ser fonte oficial dos novos agendamentos e permanece apenas durante a migração controlada do legado;
10. `api-semit` e `api-gestao-publica` devem convergir para a mesma API e a mesma base lógica de usuários.

### 27.2 Escopo funcional alvo

Portal do cidadão:

- seleção de secretaria/unidade, serviço, data e horário;
- confirmação com protocolo e histórico em “Meus agendamentos”;
- cancelamento e reagendamento conforme regras do serviço;
- confirmação e lembretes por e-mail; WhatsApp após homologação específica;
- fila de espera e aviso de vaga em fase posterior;
- experiência acessível e responsiva para navegador e aplicativo.

Operação e administração:

- unidades, serviços, duração, intervalos, capacidade e locais;
- agendas por serviço, atendente e recurso;
- horário regular, feriados, pausas, férias, bloqueios e exceções;
- calendário diário, semanal e mensal;
- criação manual pelo atendente;
- confirmação, atendimento, ausência, cancelamento e reagendamento;
- permissões por unidade e papéis `agenda_admin`, `agenda_manager` e `agenda_attendant`;
- relatórios de volume, ocupação, cancelamentos, ausência e tempo de espera;
- exportação controlada e trilha de auditoria.

### 27.3 Requisitos técnicos e de segurança

- reserva atômica de horário, impedindo dupla marcação concorrente;
- idempotência em criação, cancelamento, reagendamento e notificações;
- datas armazenadas em UTC e apresentadas em `America/Sao_Paulo`;
- rate limit nos fluxos de consulta e escrita;
- validação no servidor de duração, antecedência, janela, disponibilidade e permissão;
- MongoDB como fonte transacional; Redis somente para fila, cache e bloqueios efêmeros;
- logs sem senha, token ou CPF completo;
- minimização, retenção e descarte definidos segundo LGPD;
- acessibilidade eMAG/WCAG e navegação por teclado;
- OpenAPI, testes unitários, integração, concorrência e ponta a ponta;
- backup e restore das novas coleções incluídos antes da entrada em produção;
- nenhum deploy destrutivo ou substituição do legado sem homologação e rollback.

### 27.4 Fases de implementação

#### Fase A — Fundação da API e identidade única

- [x] Definir `User` central como única identidade.
- [x] Criar modelos iniciais de unidade, serviço, vínculo de permissão e agendamento.
- [x] Criar middleware de autorização da Agenda referenciado ao usuário central.
- [x] Criar endpoints iniciais `/api/agenda/me`, catálogo, meus agendamentos, criação e cancelamento.
- [x] Criar consulta de disponibilidade por serviço/data sem exposição de dados pessoais.
- [x] Criar fechamento de data e horários especiais por serviço.
- [x] Impedir que o cliente escolha o proprietário do agendamento.
- [x] Criar chave exclusiva de reserva para impedir dupla marcação.
- [x] Criar e executar testes de identidade, autorização, concorrência e liberação do slot.
- [ ] Publicar OpenAPI inicial.

Critério de aceite: nenhum endpoint da Agenda cria usuário ou aceita identidade enviada pelo cliente; duas reservas simultâneas não ocupam o mesmo slot.

#### Fase B — Disponibilidade e administração

- [ ] Completar calendários, exceções, feriados, férias, pausas e buffers.
- [x] Suportar capacidade de 1 a 20 vagas com faixas exclusivas e proteção contra concorrência.
- [x] Implementar cadastro, listagem e desativação de atendentes, salas e equipamentos por unidade.
- [x] Vincular recursos ativos aos serviços e às reservas com seleção automática e exclusividade concorrente.
- [x] Criar listagem e edição administrativa de unidades e serviços com escopo por unidade.
- [x] Criar listagem, concessão e revogação auditável de vínculos operacionais.
- [ ] Completar exclusão lógica, paginação e telas do CRUD administrativo.
- [x] Implementar reagendamento atômico do cidadão.
- [x] Implementar agendamento manual idempotente pelo atendente, referenciando apenas usuário central ativo.
- [x] Implementar estados e transições formais do atendimento.
- [x] Criar agenda operacional paginada e filtrada por escopo.
- [x] Criar resumo por status e auditoria das transições.
- [ ] Completar indicadores avançados, exportação e painéis históricos.

#### Fase C — Portal React

- [ ] Criar frontend isolado e responsivo sob `/agendamentos/`.
- [ ] Reutilizar login, sessão e recuperação de senha centrais.
- [ ] Implementar fluxo serviço → data → horário → confirmação.
- [ ] Implementar “Meus agendamentos”.
- [ ] Criar painel por perfil e unidade.
- [ ] Validar acessibilidade, segurança, desempenho e navegadores suportados.

#### Fase D — Adequação do Flutter

- [ ] Criar cliente HTTP da Agenda usando o JWT central.
- [ ] Remover acesso direto do Flutter às coleções Firestore de agendamento.
- [ ] Adaptar criação, histórico, cancelamento e reagendamento.
- [ ] Manter compatibilidade temporária com versões móveis anteriores.
- [ ] Publicar atualização somente após homologação web/API.

#### Fase E — Migração e notificações

- [ ] Inventariar `appointments`, `services`, bloqueios e vínculos no Firestore.
- [ ] Mapear usuários legados para `User._id`, com relatório de ambiguidades e duplicidades.
- [ ] Migrar em ensaio repetível, com hashes, contagens e reconciliação.
- [ ] Criar confirmação e lembretes idempotentes nos workers.
- [ ] Testar e-mail; homologar WhatsApp separadamente.
- [ ] Preservar histórico e cadeia de auditoria.

#### Fase F — Homologação e entrada em produção

- [ ] Executar testes funcionais com cidadãos, atendentes e gestores.
- [ ] Realizar teste de carga e disputa pelo mesmo horário.
- [ ] Testar backup, restore, rollback e indisponibilidade de integrações.
- [ ] Operar legado e novo sistema em paralelo controlado.
- [ ] Trocar o cartão “Agendamentos” somente após aceite formal.
- [ ] Manter o legado somente para consulta durante a janela definida.
- [ ] Desativar escritas no Firestore apenas após reconciliação final.

### 27.5 Estado inicial em 27/08/2026

A implementação começou somente no checkout versionado `api-gestao-publica`; nenhuma rota foi implantada no container de produção e o agendamento Flutter atual não foi alterado.

Fundação criada:

- `AgendaUnit`: unidade/local de atendimento;
- `AgendaService`: serviço, duração, intervalo e disponibilidade semanal;
- `AgendaUserAssignment`: papel da Agenda referenciado ao `User` central;
- `AgendaAppointment`: agendamento referenciado ao `User`, com protocolo e reserva exclusiva;
- `AgendaAvailabilityException`: fechamento ou horário especial por serviço/data;
- `AgendaRoutes`/`AgendaController`: identidade, catálogo, criação, histórico, cancelamento e administração inicial;
- `agenda-auth`: autorização por vínculo e administrador global;
- `agenda-time`: validação de janela e disponibilidade na zona municipal;
- teste de integração para identidade central, tentativa de personificação, autorização e disputa do slot.

Validação inicial concluída:

- 14 testes próprios da Agenda aprovados;
- identidade carregada exclusivamente de `users`;
- tentativa de enviar outro `userId` ignorada e vínculo mantido com o usuário autenticado;
- cidadão impedido de criar unidades ou conceder permissões;
- segunda reserva do mesmo serviço/horário recusada com conflito;
- cancelamento libera o slot para nova reserva;
- consulta de disponibilidade oculta dados pessoais e respeita fechamento/horário especial;
- criação também respeita fechamento e horário especial, impedindo contorno da consulta;
- proteção exclusiva cobre todo o intervalo e bloqueia sobreposição parcial;
- criação e reagendamento possuem chaves de idempotência; cancelamento repetido é seguro;
- reagendamento troca o intervalo atomicamente e preserva a reserva original quando há conflito;
- 26 testes de regressão de cadastro, login, refresh token, autorização e Estradas Rurais aprovados;
- conjunto final com 40 testes aprovados em 7 suítes;
- sintaxe dos modelos, helpers, controller, rotas, teste e servidor validada;
- nenhuma imagem foi reconstruída e nenhum container de produção foi reiniciado.

Próxima entrega: revisar o contrato dos endpoints, gerar OpenAPI e iniciar disponibilidade avançada antes de qualquer frontend.

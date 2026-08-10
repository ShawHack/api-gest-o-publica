# Funcionalidades da Aplicação e Dashboard

Este documento lista as funcionalidades disponíveis no sistema, com foco no que está acessível pela dashboard e pelos módulos integrados.

## Dashboard Web (React)

### Acesso e autenticação
- Login de usuário.
- Cadastro de usuário.
- Recuperação de senha (solicitar e redefinir).
- Verificação de e-mail.
- Controle de sessão por token.
- Controle de acesso por perfil (`admin`, `concessionario`, `monitor` e usuário autenticado).

### Navegação principal (menu)
- Home.
- Memorial (admin e concessionário).
- Usuários (admin).
- Compliance (admin).
- Perfil.
- Sair.
- Busca global de sepultados no topo (com sugestões/autocomplete).

### Home
- Listagem paginada de sepultados recentes.
- Abertura de detalhes de sepultado.
- Expansão de imagem em modal.
- Card de atalho para Compliance (admin).

### Módulo Memorial / Sepultados
- Pesquisa pública de sepultados.
- Sugestões e autocomplete.
- Detalhe de sepultado.
- Lista “Meu Memorial” para perfis autorizados.
- Criação de registro (admin).
- Edição de registro (admin e concessionário atribuído).
- Exclusão de registro (admin).
- Comentários em sepultados:
  - listar comentários;
  - adicionar comentário autenticado;
  - remover comentário (autor/admin).
- Atribuição e desatribuição de concessionário por registro (admin).
- Ações operacionais de status (`schedule`, `conclude`).

### Módulo Usuários (admin)
- Listagem de usuários.
- Criação de usuário.
- Edição de usuário.
- Exclusão de usuário.
- Alteração de perfil/permissões.
- Rotas administrativas auxiliares (institutos, concessionários, permissões específicas).

### Módulo Compliance LGPD (admin)
- Portal de compliance com autenticação dedicada.
- Dashboard com métricas de auditoria:
  - severidade atual;
  - total de eventos;
  - total de negados;
  - ações requeridas.
- Janela de análise configurável (6h, 12h, 24h, 48h, 72h).
- Alertas priorizados por severidade.
- Disparo manual de alerta HIGH.
- Filtros da trilha de auditoria por:
  - ação;
  - tipo de recurso;
  - status;
  - período (de/até);
  - paginação e limite por página.
- Exportação CSV da página atual.
- Impressão e geração de relatório em PDF.

### Módulo Monitoramento de Turno (Shift Handover)
- Login de monitoramento.
- Listagem de passagens de turno.
- Criação de passagem.
- Edição de passagem.
- Visualização detalhada.
- Acesso restrito a `monitor` e `admin`.

### Módulo Medicamentos
- Tela pública com layout próprio.
- Consulta de medicamentos.
- Busca por termo.
- Resumo consolidado.
- Consulta por farmácia.
- Endpoint de atualização da base (`refresh`).

### Utilidades visuais
- Botão flutuante de WhatsApp.
- Navbar responsiva com menu hambúrguer.
- Mensagens globais de feedback.

## App Flutter (`prefeitura_app`)

### Base do app
- Execução em mobile e web.
- Localização em português (pt-BR).
- Tema institucional.
- Rotas nomeadas com fallback em `onUnknownRoute`.

### Acesso e conta
- Login.
- Cadastro.
- Perfil.
- Fluxos de senha e verificação (via backend).

### Agendamentos
- Área do cidadão (`/user-web`).
- Novo agendamento (`/new-appointment`).
- Meus agendamentos (`/my-appointments`).
- Painel de atendente (`/attendant`).
- Painel de gerente (`/manager`).

### Formulários Garça
- Login do módulo (`/forms-garca-login`).
- Painel de formulários (`/forms-garca`).
- Lista de inscrições (`/inscriptions`).
- Integração com upload de arquivos.

### Iluminação Pública
- Home do módulo (`/iluminacao`).
- Scanner de QR Code do poste (`/iluminacao/scan`).
- Abertura de reporte de problema por tipo.
- Painel admin (`/iluminacao/admin`).
- Suporte a deep link de reporte (`/iluminacao/report/:poleId`).

### Estradas Rurais (Rotas)
- Busca pública de UPAs (RTDB `upa-rural`).
- Estatísticas, serviços públicos e sobre.
- Proprietário autenticado: solicitar vínculo UPA e cadastrar veículos (whitelist pendente).
- Admin SEMIT (`admin` / `rotas_admin`): aprovar vínculos/veículos, consultar UPAs, alertas LPR.
- Webhook Intelbras LPR na API (`POST /api/rotas-rurais/lpr/intelbras`).

## Backend/API (`backend`)

### Segurança, estabilidade e operação
- CORS configurável por lista e regex.
- Hardening HTTP com `helmet`.
- Rate limiting global e de autenticação.
- Middleware de métricas.
- Tratamento global de erro (incluindo upload).
- Healthchecks:
  - `GET /health`
  - `GET /readyz`
  - `GET /stats`

### Usuários (`/users` e `/api/users`)
- Registro.
- Login.
- Verificação de sessão/usuário.
- Verificação de e-mail.
- Reenvio de verificação.
- Esqueci senha / reset de senha.
- CRUD administrativo de usuários.
- Alteração de perfil/role.
- Endpoints administrativos complementares.

### Sepultados (`/sepultados`)
- Pesquisa, sugestões e autocomplete.
- Listagem geral e por usuário.
- Detalhe por ID.
- CRUD de registros (com regras de permissão).
- Comentários com antispam e moderação.
- Atribuição/desatribuição de concessionário.
- Ações operacionais de ciclo.

### DLOC (`/dloc`)
- Consulta por quadra.

### Serviços (`/services`)
- Upload de imagem para serviços.

### Formulários Garça (`/forms-garca`)
- Health do módulo.
- Estatísticas.
- CRUD de formulários.
- CRUD de inscrições.
- Checagem de inscrição.
- Upload simples e múltiplo.

### SEMIT A PET (`/pets`, `/adoption-requests` e vacinação)
- Cadastro de pet com imagens.
- Edição e exclusão.
- Lista pública (`GET /pets`) com `applicantsCount` (pretendentes na fila); novos interessados podem entrar na fila.
- Fila de adoção (`adoption_requests`): múltiplos pretendentes por pet, posição por ordem de chegada.
- `POST /pets/:id/adoption-requests` ou `PATCH /schedule/:id` — entrar na fila; resposta com `position` e `total`.
- `GET /pets/:id/adoption-requests` — fila para o doador.
- `GET /adoption-requests/my` — minhas solicitações com posição na fila.
- `PATCH /adoption-requests/:id/status` — doador/admin altera status (`enviada`, `em_analise`, `aprovada`, `recusada`, `concluida`, etc.).
- Cancelar: doador (`PATCH /pets/cancel/:id`), adotante (`PATCH /cancel-adopter/:id` ou `/adoption-requests/:id/cancel`).
- Admin: `GET /pets/admin/adoption-queue`, `GET /pets/admin/reports`, `PATCH /pets/admin/:petId/suspend`.
- Denúncia: `POST /pets/:id/report`.
- Chat na solicitação: `GET /adoption-requests/:id/chat`, `POST .../messages`, `POST .../presence` (online / última visualização); UI com atualização automática (~8s) em Meus Pets e Minhas Adoções; **e-mail** ao receber recado.
- Privacidade: contato liberado após aprovação.
- Vacinação: listar (autenticado), criar, editar e excluir.

### Estradas Rurais (`/rotas-rurais` e `/api/rotas-rurais`)
- Webhook LPR Intelbras (`POST /lpr/intelbras`) com API key.
- Vínculo proprietário ↔ UPA (solicitar, listar, aprovar/revogar).
- Whitelist de veículos rurais (cadastro com consentimento LGPD; aprovação admin).
- Alertas de placa desconhecida para central SEMIT (cooldown por placa+câmera).
- Auditoria nas ações administrativas (`module: rotas-rurais`).
- Detalhes: `backend/docs/ROTAS_RURAIS_MODULE.md`.

### Arborização (`/arvores`)
- Abertura de solicitação com imagem.
- Listagem geral e “minhas árvores”.
- Detalhe, edição e exclusão.
- Fluxo: solicitar, concluir, cancelar.
- Atualização de status.

### Denúncias (`/denounces`)
- Criação de denúncia com imagem.
- Listagem administrativa.
- Atualização de status da denúncia.

### Configurações do sistema (`/settings`)
- Listar configurações.
- Consultar por chave.
- Atualizar configuração (autenticado).

### Medicamentos (`/medicamentos`)
- Listar todos.
- Resumo.
- Busca.
- Listar por farmácia.
- Consultar.
- Atualizar base (`refresh`).

### Votação (`/votacao`)
- Autenticação eleitoral (login/refresh).
- Área administrativa:
  - dashboard;
  - CRUD de votações;
  - gestão de candidatos;
  - gestão de servidores;
  - exportação CSV.
- Área do eleitor:
  - listar votações ativas;
  - votar;
  - consultar resultado;
  - ver status do próprio voto.

### Mapa Turístico (`/mapaturistico`)
- Listagem pública de pontos.
- Detalhe público.
- Listagem administrativa.
- CRUD administrativo com mídia.

### Auditoria (`/audit-logs`)
- Listagem de logs.
- Resumo analítico.
- Alertas de risco.
- Base para painel de Compliance.

## Entregas estáticas e fronts hospedados

- Entrega de assets e imagens públicas.
- SPA de votação (`/votacao`).
- SPA SAMA/SEMIT A PET (`/sama` e `/semit-a-pet`).
- Redirecionamentos para apps Flutter web:
  - `/servicos`
  - `/agendamentos`
  - `/formularios`
  - `/iluminacao`

---

Se quiser, eu também gero a versão **“matriz de permissões por perfil”** (o que cada papel pode ver/fazer em cada módulo).

# Agenda Garça — Documentação da API e Arquitetura

Estado: Implantada e operacional em produção (`https://api.garca.sp.gov.br/agendamentos/`).

Prefixo canônico: `/api/agenda`.

## Identidade e Permissões

Todos os endpoints autenticados utilizam o JWT central da plataforma GovCidadão / Garça Digital carregado a partir da coleção `users`.

- A identidade é validada pelo middleware central;
- Permissões de operação e gestão são controladas por `AgendaUserAssignment`, associando `userId` à sua respectiva `unitId`;
- Perfis suportados:
  - `admin`: Administrador global da plataforma (acesso irrestrito a todas as unidades);
  - `agenda_admin`: Administrador geral da Agenda;
  - `agenda_manager`: Gestor de Unidade (configuração de catálogo, feriados e equipe da sua unidade);
  - `agenda_attendant`: Atendente / Operador da Unidade (chamadas de painel, controle de presença e relatórios da unidade).

## Tabela de Endpoints

| Método | Caminho | Acesso | Finalidade |
|---|---|---|---|
| `GET` | `/me` | Autenticado | Retorna identidade, papéis e unidades vinculadas |
| `GET` | `/services` | Autenticado | Catálogo ativo de serviços e unidades para agendamento |
| `GET` | `/services/:id/availability?date=AAAA-MM-DD` | Autenticado | Horários livres/ocupados com capacidade em tempo real |
| `GET` | `/appointments/mine` | Autenticado | Histórico de agendamentos do próprio cidadão |
| `POST` | `/appointments` | Autenticado | Criar agendamento pessoal com Idempotency-Key |
| `PATCH` | `/appointments/:id/reschedule` | Titular | Reagendamento atômico para outro serviço ou horário |
| `PATCH` | `/appointments/:id/cancel` | Titular | Cancelamento do agendamento com liberação do horário |
| `GET` | `/admin/units` | Operador / Gestor | Listar unidades dentro do escopo de permissão |
| `POST` | `/admin/units` | Administrador Global | Criar nova unidade de atendimento |
| `PATCH` | `/admin/units/:id` | Gestor da unidade | Editar dados da unidade (nome, endereço, fuso horário, status) |
| `DELETE` | `/admin/units/:id` | Gestor da unidade | Excluir unidade (com validação de dependências ativas) |
| `GET` | `/admin/services` | Operador / Gestor | Listar serviços cadastrados da unidade |
| `POST` | `/admin/services` | Gestor da unidade | Criar novo serviço com expediente, intervalos e equipe |
| `PATCH` | `/admin/services/:id` | Gestor da unidade | Atualizar configurações de serviço ou status |
| `POST` | `/admin/services/:id/banner` | Gestor da unidade | Upload de banner personalizado para a landing page |
| `GET` | `/admin/resources` | Operador / Gestor | Listar atendentes e recursos da unidade |
| `POST` | `/admin/resources` | Gestor da unidade | Cadastrar/vincular atendente à unidade e sincronizar usuário |
| `PATCH` | `/admin/resources/:id` | Gestor da unidade | Editar ou alterar status do atendente |
| `DELETE` | `/admin/resources/:id` | Gestor da unidade | Desvincular atendente da unidade |
| `GET` | `/admin/schedule-blocks` | Gestor da unidade | Listar feriados, pausas e bloqueios de agenda |
| `POST` | `/admin/schedule-blocks` | Gestor da unidade | Criar bloqueio de agenda por unidade ou recurso |
| `PATCH` | `/admin/schedule-blocks/:id/revoke` | Gestor da unidade | Revogar bloqueio de agenda |
| `GET` | `/admin/appointments` | Operador / Gestor | Listagem com busca textual, filtros de período, unidade, serviço, atendente e status |
| `POST` | `/admin/appointments` | Operador / Gestor | Criar agendamento presencial/manual |
| `POST` | `/admin/appointments/:id/call` | Operador / Atendente | Chamar senha no painel físico (TV), Mobile NovoSGA e Web |
| `PATCH` | `/admin/appointments/:id/status` | Operador / Atendente | Atualizar status (`confirmed`, `completed`, `no_show`, `cancelled`) |
| `GET` | `/admin/reports/summary` | Gestor / Admin | Relatório consolidado com KPIs operacionais |

## Integração NovoSGA, TV e Aplicativo Mobile

O sistema de chamadas da Agenda Garça opera de forma híbrida e sincronizada entre:
1. **Banco MySQL NovoSGA (`novosga2`) no servidor `.31`**:
   - As chamadas geram inserção direta na tabela `painel_senha` com `unidade_id`, `servico_id`, `num_senha`, `sig_senha`, `local` e `num_local`.
2. **Mercure Hub SSE (`10.15.25.31:3000/.well-known/mercure`)**:
   - Disparo de eventos autorizados via JWT assinado com a chave do Mercure para os tópicos `/paineis` e `/unidades/{id}/painel`.
   - Compatibilidade imediata com TVs oficiais, Painel Web e Aplicativo Mobile NovoSGA.
3. **Audit Trail**:
   - Todas as operações de agendamento, cancelamento, alteração de status e concessão de papéis são registradas de forma auditável e segura.

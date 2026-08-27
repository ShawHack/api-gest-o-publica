# Agenda Garça — contrato inicial da API

Estado: fundação em desenvolvimento, ainda não implantada em produção.

Prefixo canônico: `/api/agenda`.

## Identidade

Todos os endpoints exigem o JWT central da plataforma. A identidade é carregada pelo middleware `verifyToken` a partir da coleção `users`.

- a Agenda não possui endpoint de cadastro ou login;
- o cliente não escolhe `userId` ao agendar;
- `userId` é obtido exclusivamente de `req.user`;
- permissões operacionais são registros `AgendaUserAssignment` que referenciam `User._id`;
- senhas, hashes, tokens e CPF não são copiados para as coleções da Agenda.

## Endpoints iniciais

| Método | Caminho | Acesso | Finalidade |
|---|---|---|---|
| `GET` | `/me` | usuário central | identidade e permissões da Agenda |
| `GET` | `/services` | usuário central | catálogo ativo de serviços e unidades |
| `GET` | `/services/:id/availability?date=AAAA-MM-DD` | usuário central | horários livres/ocupados sem dados pessoais |
| `GET` | `/appointments/mine` | usuário central | histórico do próprio usuário |
| `POST` | `/appointments` | usuário central | reservar horário para o usuário autenticado |
| `PATCH` | `/appointments/:id/reschedule` | proprietário | reagendar atomicamente para outro serviço/horário |
| `PATCH` | `/appointments/:id/cancel` | proprietário | cancelar e liberar o slot dentro do prazo |
| `POST` | `/admin/units` | administrador global | criar unidade de atendimento |
| `GET` | `/admin/units` | gestor da Agenda | listar unidades dentro do seu escopo |
| `PATCH` | `/admin/units/:id` | gestor da unidade | editar ou ativar/desativar unidade |
| `GET` | `/admin/services` | gestor da Agenda | listar serviços do seu escopo, inclusive inativos |
| `POST` | `/admin/services` | administrador da Agenda | criar serviço e agenda semanal |
| `PATCH` | `/admin/services/:id` | gestor da unidade | editar regras, agenda semanal ou ativação |
| `GET` | `/admin/resources` | gestor da unidade | listar atendentes, salas e equipamentos do escopo |
| `POST` | `/admin/resources` | gestor da unidade | cadastrar recurso na unidade |
| `PATCH` | `/admin/resources/:id` | gestor da unidade | editar ou desativar recurso preservando histórico |
| `PUT` | `/admin/services/:id/availability-exception` | administrador da Agenda | fechar uma data ou definir horário especial |
| `GET` | `/admin/assignments` | administrador da Agenda | listar vínculos permitidos pelo escopo |
| `POST` | `/admin/assignments` | administrador global | vincular papel da Agenda a usuário existente |
| `PATCH` | `/admin/assignments/:id/revoke` | administrador global | revogar vínculo sem apagar seu histórico |
| `GET` | `/admin/appointments` | atendente da unidade | agenda paginada com filtros de unidade, serviço, usuário, período e status |
| `POST` | `/admin/appointments` | atendente da unidade | criar reserva presencial para usuário central existente |
| `PATCH` | `/admin/appointments/:id/status` | atendente da unidade | confirmar, concluir, registrar ausência ou cancelar |
| `GET` | `/admin/reports/summary` | gestor da Agenda | totais operacionais agrupados por status |

Transições aceitas: `booked → confirmed/cancelled` e `confirmed → completed/no_show/cancelled`. Estados finais não podem ser reabertos por esse endpoint. Cada mudança registra autor, data, motivo e auditoria.

O agendamento manual exige `userId` de uma conta central ativa, serviço dentro do escopo do atendente e `Idempotency-Key`. Ele não cria usuário, senha ou identidade paralela e registra `source: admin` e o operador na trilha de status/auditoria.

## Criação de agendamento

Exemplo de entrada:

```json
{
  "serviceId": "ObjectId",
  "startsAt": "2026-09-01T12:00:00.000Z",
  "source": "web",
  "notes": "Observação opcional"
}
```

`userId`, nome, e-mail, telefone, duração, unidade e horário final enviados pelo cliente são ignorados. A API resolve esses valores a partir do usuário central e do serviço cadastrado.

O cliente web/mobile deve enviar uma `Idempotency-Key` estável (8 a 120 caracteres alfanuméricos, ponto, sublinhado, dois-pontos ou hífen) em cada tentativa lógica de criação. Repetir a mesma chave e os mesmos dados devolve o agendamento original com `Idempotent-Replayed: true`; reutilizá-la com outros dados devolve `409`. No reagendamento essa chave é obrigatória. O cancelamento já é idempotente por estado: repetir o cancelamento de uma reserva cancelada devolve o mesmo estado sem novo efeito.

Validações iniciais:

- usuário e e-mail central verificado;
- unidade e serviço ativos;
- antecedência e janela máxima;
- dia, período e intervalo configurados;
- duração integral dentro do período;
- exclusividade de todo o intervalo ocupado, inclusive sobreposição parcial;
- exceções administrativas validadas novamente no momento da escrita;
- rate limit de escrita.

Respostas relevantes:

- `201`: reserva criada;
- `401`: identidade central ausente ou inválida;
- `403`: e-mail não confirmado ou permissão insuficiente;
- `409`: horário ocupado ou transição incompatível;
- `422`: regra de agenda ou entrada inválida.

## Disponibilidade e exceções

A disponibilidade semanal pertence a `AgendaService`. Uma exceção por serviço/data pode:

- `closed`: fechar integralmente a data;
- `custom`: substituir a agenda semanal por períodos especiais.

A consulta de disponibilidade retorna apenas horário, instante UTC, estado livre/ocupado e `remainingCapacity`. Nenhum dado do titular da reserva é exposto.

## Concorrência

Cada reserva ativa possui uma chave por minuto ocupado e faixa de capacidade em `reservationKeys`. O índice multikey único do MongoDB é a barreira final contra reservas iguais ou parcialmente sobrepostas dentro da mesma faixa, inclusive sob concorrência. A API tenta atomicamente as faixas `0..capacity-1`; quando todas estão ocupadas, responde conflito. No cancelamento, as chaves são removidas e a vaga volta a ficar disponível.

O reagendamento troca serviço, unidade, início, fim e chaves de reserva em uma única atualização atômica do documento. Se o novo intervalo estiver ocupado, o índice rejeita a atualização e a reserva anterior permanece intacta.

Recursos múltiplos e registro durável de idempotência separado do agendamento serão adicionados antes da produção.

## Auditoria

Criação, cancelamento, concessão de papel e exceção de disponibilidade geram eventos no módulo `agenda-garca`. Metadados de auditoria não devem conter senha, token ou CPF completo.

## Próximas extensões incompatíveis com produção

- paginação e filtros administrativos;
- máquina formal de estados;
- retenção e limpeza das chaves de idempotência;
- agenda por atendente/recurso;
- feriados gerais e exceções por unidade;
- capacidade maior que um;
- OpenAPI gerado e clientes React/Flutter tipados;
- migração reconciliada do Firestore.

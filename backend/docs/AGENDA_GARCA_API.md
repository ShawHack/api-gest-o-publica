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
| `PATCH` | `/appointments/:id/cancel` | proprietário | cancelar e liberar o slot dentro do prazo |
| `POST` | `/admin/units` | administrador global | criar unidade de atendimento |
| `POST` | `/admin/services` | administrador da Agenda | criar serviço e agenda semanal |
| `PUT` | `/admin/services/:id/availability-exception` | administrador da Agenda | fechar uma data ou definir horário especial |
| `POST` | `/admin/assignments` | administrador global | vincular papel da Agenda a usuário existente |

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

Validações iniciais:

- usuário e e-mail central verificado;
- unidade e serviço ativos;
- antecedência e janela máxima;
- dia, período e intervalo configurados;
- duração integral dentro do período;
- exclusividade do par serviço/horário;
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

A consulta de disponibilidade retorna apenas horário, instante UTC e estado livre/ocupado. Nenhum dado do titular da reserva é exposto.

## Concorrência

Cada reserva ativa possui `reservationKey` exclusiva formada pelo serviço e instante inicial normalizado. O índice único do MongoDB é a barreira final contra duas reservas concorrentes. No cancelamento, a chave é removida e o slot pode ser reservado novamente.

Capacidade superior a uma pessoa, recursos múltiplos, reagendamento atômico e idempotency keys serão adicionados antes da produção.

## Auditoria

Criação, cancelamento, concessão de papel e exceção de disponibilidade geram eventos no módulo `agenda-garca`. Metadados de auditoria não devem conter senha, token ou CPF completo.

## Próximas extensões incompatíveis com produção

- paginação e filtros administrativos;
- máquina formal de estados;
- idempotência por requisição;
- agenda por atendente/recurso;
- feriados gerais e exceções por unidade;
- capacidade maior que um;
- OpenAPI gerado e clientes React/Flutter tipados;
- migração reconciliada do Firestore.

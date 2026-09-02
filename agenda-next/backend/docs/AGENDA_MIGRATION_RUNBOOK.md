# Agenda Garça — ensaio e migração do legado

Estado: preparação; nenhuma migração em produção foi autorizada ou executada.

## Princípios obrigatórios

1. Firestore permanece somente leitura durante inventário e ensaios.
2. Nenhum usuário é criado automaticamente: toda reserva deve apontar para `User._id` central inequívoco.
3. Registros ambíguos são rejeitados para revisão humana; não há associação por nome, CPF parcial ou aproximação.
4. O plano não contém CPF, telefone, senha ou token. E-mail aparece somente como impressão SHA-256 truncada no inventário.
5. Escritas futuras devem ser idempotentes por `legacyId` e `checksum`, com contagens antes/depois e rollback testado.

## Etapas

1. Executar `agenda-firestore-inventory.js` com credencial de leitura dedicada.
2. Guardar apenas o relatório sanitizado em área restrita e registrar seu hash.
3. Elaborar mapa aprovado `serviço legado → AgendaService/AgendaUnit`, incluindo duração.
4. Gerar o plano determinístico com `agenda-migration-plan.js` e revisar todos os rejeitados.
5. Tratar manualmente usuários ausentes/duplicados e solicitações de mudança pendentes.
6. Resolver bloqueios específicos de serviço: o modelo legado não equivale ao bloqueio por unidade/recurso do modelo novo.
7. Restaurar cópia dos bancos em homologação e aplicar o plano nessa cópia.
8. Comparar contagens, estados, protocolos, horários e amostra funcional; repetir até diferença zero ou exceção formal aprovada.
9. Testar rollback e restauração antes de solicitar janela de produção.

## Mapeamento inicial de estados

| Firestore | Agenda | Tratamento |
|---|---|---|
| `pending` | `booked` | automático quando usuário/serviço/horário são válidos |
| `attended` | `completed` | automático |
| `noShow` | `no_show` | automático |
| `cancelled` | `cancelled` | automático, sem chaves de reserva ativas |
| `changeDenied` | `booked` | automático, preservando auditoria da origem |
| `changeRequested` | — | revisão humana obrigatória |
| `changeApproved` | — | revisão humana para confirmar qual horário prevalece |

## Critérios de bloqueio do go-live

- usuário central ausente ou duplicado;
- serviço sem mapeamento aprovado;
- diferença de duração entre slot legado e serviço novo;
- data/horário inválido;
- mudança ainda pendente;
- bloqueio específico de serviço sem representação equivalente;
- divergência de contagem ou checksum;
- backup, restore ou rollback não comprovado.

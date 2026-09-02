FROM api-semit-api:pre-agenda

COPY --chown=node:node server.js /app/server.js
COPY --chown=node:node controllers/AgendaController.js /app/controllers/AgendaController.js
COPY --chown=node:node routes/AgendaRoutes.js /app/routes/AgendaRoutes.js
COPY --chown=node:node helpers/agenda-auth.js /app/helpers/agenda-auth.js
COPY --chown=node:node helpers/agenda-time.js /app/helpers/agenda-time.js
COPY --chown=node:node models/AgendaAppointment.js /app/models/AgendaAppointment.js
COPY --chown=node:node models/AgendaAvailabilityException.js /app/models/AgendaAvailabilityException.js
COPY --chown=node:node models/AgendaResource.js /app/models/AgendaResource.js
COPY --chown=node:node models/AgendaScheduleBlock.js /app/models/AgendaScheduleBlock.js
COPY --chown=node:node models/AgendaService.js /app/models/AgendaService.js
COPY --chown=node:node models/AgendaUnit.js /app/models/AgendaUnit.js
COPY --chown=node:node models/AgendaUserAssignment.js /app/models/AgendaUserAssignment.js

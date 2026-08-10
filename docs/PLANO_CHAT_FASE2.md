# Fase 2 — Chat Garça Pet (implementado)

## Escopo entregue

| Recurso | Implementação |
|---------|----------------|
| Mensagens em tempo quase real | Polling a cada **8s** (`GET /adoption-requests/:id/chat`) |
| Online | Heartbeat **20s**; verde se ativo nos últimos **60s** |
| Última visualização | `donorLastSeenAt` / `adopterLastSeenAt` |
| E-mail ao receber mensagem | Já na Fase 1.5 |
| UI doador | `/garcapet/pet/mypets` — `patch-adoption-chat.js` |
| UI pretendente | `/garcapet/pet/myadoptions` — mesmo módulo |

## API

- `GET /api/adoption-requests/:requestId/chat` — mensagens + presença
- `POST /api/adoption-requests/:requestId/presence` — `{ heartbeat, markSeen }`
- `POST /api/adoption-requests/:requestId/messages` — enviar (com e-mail)

## Próximo nível (Fase 3 — opcional)

- WebSocket (Socket.io) para latência &lt; 1s
- Push no app Flutter (`prefeitura_app`)
- Indicador “digitando…”

## Arquivos

- `backend/models/AdoptionRequest.js` — campos de presença
- `backend/helpers/adoption-request-service.js` — `touchPresence`, `buildChatPresence`
- `backend/controllers/AdoptionRequestController.js` — `getChat`, `postPresence`
- `backend/public/sama/patch-adoption-chat.js` — UI
- `backend/public/sama/index.html` — carrega o script

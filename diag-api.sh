#!/bin/bash
set -e
cd /home/semit/Documentos/api-semit
echo '=== current routes 65-80 ==='
sed -n '65,80p' backend/routes/votacaoRoutes.js
echo '=== orig routes 65-80 ==='
sed -n '65,80p' backend/routes/votacaoRoutes.js.orig
echo '=== container routes 65-80 ==='
docker exec api sed -n '65,80p' /app/routes/votacaoRoutes.js
echo '=== handler types ==='
docker exec api node <<'NODE'
const A = require('./controllers/VotingAdminController')
const u = require('./helpers/voting-upload')
console.log('notifyClosedWhatsapp', typeof A.notifyClosedWhatsapp)
console.log('patchVotation', typeof A.patchVotation)
console.log('votingBannerUploadMiddleware', typeof u.votingBannerUploadMiddleware)
const E = require('./controllers/VotingElectionAdminController')
console.log('exportResultsV2', typeof E.exportResultsV2)
console.log('exportVotesV2', typeof E.exportVotesV2)
NODE
echo '=== grep notify in container VotingAdmin ==='
docker exec api grep -n notifyClosedWhatsapp /app/controllers/VotingAdminController.js || echo AUSENTE

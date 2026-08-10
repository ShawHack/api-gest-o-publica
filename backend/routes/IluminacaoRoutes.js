const router = require('express').Router()
const { verifyIluminacaoNotifyAccess } = require('../helpers/iluminacao-notify-auth')
const IluminacaoReportController = require('../controllers/IluminacaoReportController')

// Abertura do chamado: cidadão (segredo) ou admin JWT / API key
router.post(
  '/reports/:id/notify-created',
  verifyIluminacaoNotifyAccess,
  IluminacaoReportController.notifyCreated,
)

// Mudança de status: segredo do app/painel, JWT admin ou API key
router.post(
  '/reports/:id/notify-status',
  verifyIluminacaoNotifyAccess,
  IluminacaoReportController.notifyStatusChange,
)

module.exports = router

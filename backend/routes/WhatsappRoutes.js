const router = require('express').Router()
const verifyToken = require('../helpers/verify-token')
const { requireRole } = require('../helpers/authz')
const WhatsappController = require('../controllers/WhatsappController')

// Evolution → Semit (público, protegido por EVOLUTION_WEBHOOK_SECRET)
router.post('/webhook', WhatsappController.webhook)

// Operação / painel
router.get('/status', verifyToken, requireRole('admin'), WhatsappController.status)
router.post('/send', verifyToken, requireRole('admin'), WhatsappController.send)

module.exports = router

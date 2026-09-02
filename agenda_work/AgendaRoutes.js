const router = require('express').Router()
const { rateLimit } = require('express-rate-limit')
const verifyToken = require('../helpers/verify-token')
const { attachAgendaContext, requireGlobalAgendaAdmin, requireAgendaAdmin } = require('../helpers/agenda-auth')
const AgendaController = require('../controllers/AgendaController')

const bookingLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: process.env.NODE_ENV === 'test' ? 1000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
})

// Toda operação da Agenda Garça parte da identidade central validada por verifyToken.
router.use(verifyToken, attachAgendaContext)

router.get('/me', AgendaController.me)
router.get('/services', AgendaController.listServices)
router.get('/services/:id/availability', bookingLimiter, AgendaController.availability)
router.get('/appointments/mine', AgendaController.listMine)
router.post('/appointments', bookingLimiter, AgendaController.createAppointment)
router.patch('/appointments/:id/cancel', bookingLimiter, AgendaController.cancelMine)

router.post('/admin/units', requireGlobalAgendaAdmin, AgendaController.createUnit)
router.post('/admin/services', requireAgendaAdmin, AgendaController.createService)
router.put('/admin/services/:id/availability-exception', requireAgendaAdmin, AgendaController.upsertAvailabilityException)
router.post('/admin/assignments', requireGlobalAgendaAdmin, AgendaController.createAssignment)

module.exports = router

const router = require('express').Router()
const { rateLimit } = require('express-rate-limit')
const verifyToken = require('../helpers/verify-token')
const {
  attachAgendaContext,
  requireGlobalAgendaAdmin,
  requireAgendaAdmin,
  requireAgendaManager,
  requireAgendaOperator,
} = require('../helpers/agenda-auth')
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
router.patch('/appointments/:id/reschedule', bookingLimiter, AgendaController.rescheduleMine)
router.patch('/appointments/:id/cancel', bookingLimiter, AgendaController.cancelMine)

router.post('/admin/units', requireGlobalAgendaAdmin, AgendaController.createUnit)
router.get('/admin/units', requireAgendaManager, AgendaController.adminListUnits)
router.patch('/admin/units/:id', requireAgendaManager, AgendaController.updateUnit)
router.get('/admin/services', requireAgendaManager, AgendaController.adminListServices)
router.post('/admin/services', requireAgendaManager, AgendaController.createService)
router.patch('/admin/services/:id', requireAgendaManager, AgendaController.updateService)
router.put('/admin/services/:id/availability-exception', requireAgendaManager, AgendaController.upsertAvailabilityException)
router.get('/admin/assignments', requireAgendaAdmin, AgendaController.listAssignments)
router.post('/admin/assignments', requireGlobalAgendaAdmin, AgendaController.createAssignment)
router.patch('/admin/assignments/:id/revoke', requireGlobalAgendaAdmin, AgendaController.revokeAssignment)
router.get('/admin/appointments', requireAgendaOperator, AgendaController.adminListAppointments)
router.post('/admin/appointments', requireAgendaOperator, AgendaController.createManualAppointment)
router.patch('/admin/appointments/:id/status', requireAgendaOperator, AgendaController.updateAppointmentStatus)
router.get('/admin/reports/summary', requireAgendaManager, AgendaController.reportSummary)

module.exports = router

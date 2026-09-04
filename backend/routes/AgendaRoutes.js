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
const { imageUpload } = require('../helpers/image-upload')

const bookingLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: process.env.NODE_ENV === 'test' ? 1000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
})

// Rotas públicas (não exigem token prévio)
router.get('/public/:unitSlug/:serviceSlug', AgendaController.getPublicService)
router.get('/public/:unitSlug/:serviceSlug/availability', bookingLimiter, AgendaController.getPublicAvailability)
router.get('/panels', AgendaController.listPanels)

// Toda operação administrativa ou do usuário cidadão logado passa por verifyToken
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
router.delete('/admin/units/:id', requireAgendaAdmin, AgendaController.deleteUnit)

router.get('/admin/services', requireAgendaManager, AgendaController.adminListServices)
router.post('/admin/services', requireAgendaManager, AgendaController.createService)
router.patch('/admin/services/:id', requireAgendaManager, AgendaController.updateService)
router.post('/admin/services/:id/banner', requireAgendaManager, imageUpload.single('banner'), AgendaController.uploadServiceBanner)

router.get('/admin/resources', requireAgendaManager, AgendaController.adminListResources)
router.post('/admin/resources', requireAgendaManager, AgendaController.createResource)
router.patch('/admin/resources/:id', requireAgendaManager, AgendaController.updateResource)
router.delete('/admin/resources/:id', requireAgendaManager, AgendaController.deleteResource)

router.get('/admin/schedule-blocks', requireAgendaManager, AgendaController.listScheduleBlocks)
router.post('/admin/schedule-blocks', requireAgendaManager, AgendaController.createScheduleBlock)
router.patch('/admin/schedule-blocks/:id/revoke', requireAgendaManager, AgendaController.revokeScheduleBlock)
router.put('/admin/services/:id/availability-exception', requireAgendaManager, AgendaController.upsertAvailabilityException)

router.get('/admin/assignments', requireAgendaAdmin, AgendaController.listAssignments)
router.post('/admin/assignments', requireGlobalAgendaAdmin, AgendaController.createAssignment)
router.patch('/admin/assignments/:id/revoke', requireGlobalAgendaAdmin, AgendaController.revokeAssignment)

router.get('/admin/appointments/calendar', requireAgendaOperator, AgendaController.adminCalendar)
router.get('/admin/appointments', requireAgendaOperator, AgendaController.adminListAppointments)
router.post('/admin/appointments', requireAgendaOperator, AgendaController.createManualAppointment)
router.post('/admin/appointments/:id/call', requireAgendaOperator, AgendaController.callAppointment)
router.patch('/admin/appointments/:id/status', requireAgendaOperator, AgendaController.updateAppointmentStatus)
router.get('/admin/reports/summary', requireAgendaManager, AgendaController.reportSummary)

module.exports = router

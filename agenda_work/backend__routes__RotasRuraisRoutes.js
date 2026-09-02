const router = require('express').Router()
const { rateLimit } = require('express-rate-limit')
const verifyToken = require('../helpers/verify-token')
const { requireRotasAdmin, requireRotasOperator } = require('../helpers/rotas-auth')
const RotasOwnershipController = require('../controllers/RotasOwnershipController')
const RuralVehicleController = require('../controllers/RuralVehicleController')
const RotasLprController = require('../controllers/RotasLprController')
const RuralPortalController = require('../controllers/RuralPortalController')
const verifyRuralToken = require('../helpers/verify-rural-token')

const ruralLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === 'test' ? 1000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
})
const ruralMapSearchLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: process.env.NODE_ENV === 'test' ? 1000 : 60,
  standardHeaders: true,
  legacyHeaders: false,
})

// LPR Intelbras (API key)
router.post('/lpr/intelbras', RotasLprController.ingestIntelbras)
router.post('/portal/login', ruralLoginLimiter, RuralPortalController.login)
router.post('/portal/register-operator', ruralLoginLimiter, RuralPortalController.registerModuleApplicant)
router.get('/map/properties/search', ruralMapSearchLimiter, RuralPortalController.searchMapProperties)
router.post('/portal/change-password', verifyRuralToken, RuralPortalController.changePassword)
router.get('/portal/me', verifyRuralToken, RuralPortalController.getProfile)
router.put('/portal/profile', verifyRuralToken, RuralPortalController.saveProfile)

router.get('/operator/properties/resolve', verifyToken, requireRotasOperator, RuralPortalController.resolveProperty)
router.post('/operator/owners', verifyToken, requireRotasOperator, RuralPortalController.createOwner)
router.get('/operator/properties', verifyToken, requireRotasOperator, RuralPortalController.listManagedProperties)
router.patch('/operator/properties/:id', verifyToken, requireRotasOperator, RuralPortalController.updateManagedProperty)
router.delete('/operator/properties/:id', verifyToken, requireRotasOperator, RuralPortalController.archiveManagedProperty)

router.use(verifyToken)

// Proprietário
router.post('/ownership', RotasOwnershipController.requestOwnership)
router.get('/ownership/mine', RotasOwnershipController.listMine)
router.get('/vehicles/mine', RuralVehicleController.listMine)
router.post('/vehicles', RuralVehicleController.createMine)

// Admin SEMIT
router.get('/users', requireRotasAdmin, RuralPortalController.listModuleUsers)
router.post('/users', requireRotasAdmin, RuralPortalController.createModuleUser)
router.patch('/users/:id/role', requireRotasAdmin, RuralPortalController.updateModuleUserRole)
router.get('/properties', requireRotasAdmin, RuralPortalController.listProperties)
router.patch('/properties/:id', requireRotasAdmin, RuralPortalController.reviewProperty)
router.get('/ownership', requireRotasAdmin, RotasOwnershipController.listAdmin)
router.patch('/ownership/:id', requireRotasAdmin, RotasOwnershipController.review)
router.get('/vehicles', requireRotasAdmin, RuralVehicleController.listAdmin)
router.patch('/vehicles/:id', requireRotasAdmin, RuralVehicleController.review)
router.get('/alerts', requireRotasAdmin, RotasLprController.listAlerts)
router.patch('/alerts/:id', requireRotasAdmin, RotasLprController.updateAlert)

module.exports = router

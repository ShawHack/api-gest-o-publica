const router = require('express').Router()
const verifyToken = require('../helpers/verify-token')
const { requireRotasAdmin } = require('../helpers/rotas-auth')
const RotasOwnershipController = require('../controllers/RotasOwnershipController')
const RuralVehicleController = require('../controllers/RuralVehicleController')
const RotasLprController = require('../controllers/RotasLprController')

// LPR Intelbras (API key)
router.post('/lpr/intelbras', RotasLprController.ingestIntelbras)

router.use(verifyToken)

// Proprietário
router.post('/ownership', RotasOwnershipController.requestOwnership)
router.get('/ownership/mine', RotasOwnershipController.listMine)
router.get('/vehicles/mine', RuralVehicleController.listMine)
router.post('/vehicles', RuralVehicleController.createMine)

// Admin SEMIT
router.get('/ownership', requireRotasAdmin, RotasOwnershipController.listAdmin)
router.patch('/ownership/:id', requireRotasAdmin, RotasOwnershipController.review)
router.get('/vehicles', requireRotasAdmin, RuralVehicleController.listAdmin)
router.patch('/vehicles/:id', requireRotasAdmin, RuralVehicleController.review)
router.get('/alerts', requireRotasAdmin, RotasLprController.listAlerts)
router.patch('/alerts/:id', requireRotasAdmin, RotasLprController.updateAlert)

module.exports = router

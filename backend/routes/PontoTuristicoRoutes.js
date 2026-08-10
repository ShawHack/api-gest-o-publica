const router = require('express').Router()

const PontoTuristicoController = require('../controllers/PontoTuristicoController')
const { imageUpload } = require('../helpers/image-upload')
const verifyToken = require('../helpers/verify-token')
const { requireRole } = require('../helpers/authz')

router.get('/pontos', PontoTuristicoController.listActive)
router.get('/pontos/:id', PontoTuristicoController.getById)
router.get('/admin/pontos', verifyToken, requireRole('admin'), PontoTuristicoController.listAdmin)
router.post('/pontos', verifyToken, requireRole('admin'), imageUpload.any(), PontoTuristicoController.create)
router.put('/pontos/:id', verifyToken, requireRole('admin'), imageUpload.any(), PontoTuristicoController.update)
router.delete('/pontos/:id', verifyToken, requireRole('admin'), PontoTuristicoController.remove)

module.exports = router

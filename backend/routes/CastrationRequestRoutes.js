const router = require('express').Router()
const CastrationRequestController = require('../controllers/CastrationRequestController')
const verifyToken = require('../helpers/verify-token')
const { requireCastrationStaff } = require('../helpers/castration-auth')

router.get('/me/prefill', verifyToken, CastrationRequestController.prefill)
router.post('/', verifyToken, CastrationRequestController.create)
router.get('/mine', verifyToken, CastrationRequestController.listMine)
router.get('/mine/:id/receipt', verifyToken, CastrationRequestController.receiptMine)

router.use(verifyToken, requireCastrationStaff)

router.get('/export.csv', CastrationRequestController.exportCsv)
router.get('/', CastrationRequestController.listAdmin)
router.get('/:id/receipt', CastrationRequestController.receiptAdmin)
router.get('/:id', CastrationRequestController.getByIdAdmin)
router.patch('/:id/status', CastrationRequestController.updateStatus)
router.patch('/:id/schedule', CastrationRequestController.schedule)

module.exports = router

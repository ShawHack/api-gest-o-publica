const router = require('express').Router()

const verifyToken = require('../helpers/verify-token')
const { requireOrdemServicoAccess } = require('../helpers/ordem-servico-auth')
const OrdemServicoController = require('../controllers/OrdemServicoController')

const guard = [verifyToken, requireOrdemServicoAccess]

router.get('/meta', ...guard, OrdemServicoController.meta)
router.get('/', ...guard, OrdemServicoController.list)
router.post('/', ...guard, OrdemServicoController.create)
router.patch('/:id/status', ...guard, OrdemServicoController.updateStatus)
router.get('/:id', ...guard, OrdemServicoController.getById)
router.patch('/:id', ...guard, OrdemServicoController.update)

module.exports = router

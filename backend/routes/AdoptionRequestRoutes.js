const router = require('express').Router()
const AdoptionRequestController = require('../controllers/AdoptionRequestController')
const verifyToken = require('../helpers/verify-token')

router.get('/my', verifyToken, AdoptionRequestController.listMine)
router.get('/:requestId/chat', verifyToken, AdoptionRequestController.getChat)
router.post('/:requestId/presence', verifyToken, AdoptionRequestController.postPresence)
router.patch('/:requestId/status', verifyToken, AdoptionRequestController.updateStatus)
router.patch('/:requestId/cancel', verifyToken, AdoptionRequestController.cancelByAdopter)
router.post('/:requestId/messages', verifyToken, AdoptionRequestController.sendMessage)
router.post('/:requestId/conclude', verifyToken, AdoptionRequestController.conclude)

module.exports = router

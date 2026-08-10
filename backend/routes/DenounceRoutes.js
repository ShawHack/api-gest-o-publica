const router = require('express').Router()

const DenounceController = require('../controllers/DenounceController')

// middleware
const { imageUpload } = require("../helpers/image-upload")
const verifyToken = require('../helpers/verify-token')
const { requireRole } = require('../helpers/authz')

router.post('/create', imageUpload.array("images"), DenounceController.createDenounce)
router.get('/', verifyToken, requireRole('admin'), DenounceController.getAllDenounces)
router.patch('/:id/status', verifyToken, requireRole('admin'), DenounceController.updateDenounceStatus)

module.exports = router

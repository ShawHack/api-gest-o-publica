const router = require('express').Router()

const SystemSettingController = require('../controllers/SystemSettingController')

const verifyToken = require('../helpers/verify-token')

router.get('/', SystemSettingController.getAllSettings)
router.patch('/update', verifyToken, SystemSettingController.updateFromBody)
router.put('/:key', verifyToken, SystemSettingController.updateSetting)
router.get('/:key', SystemSettingController.getSetting)

module.exports = router

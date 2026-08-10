const router = require('express').Router()
const AuditLogController = require('../controllers/AuditLogController')
const verifyToken = require('../helpers/verify-token')
const { requireRole } = require('../helpers/authz')

router.get('/', verifyToken, requireRole('admin'), AuditLogController.list)
router.get('/summary', verifyToken, requireRole('admin'), AuditLogController.summary)
router.get('/alerts', verifyToken, requireRole('admin'), AuditLogController.alerts)
router.get('/monitoring-info', verifyToken, requireRole('admin'), AuditLogController.monitoringInfo)

module.exports = router

const router = require('express').Router()
const rateLimit = require('express-rate-limit')
const LgpdController = require('../controllers/LgpdController')
const verifyToken = require('../helpers/verify-token')
const { requireRole } = require('../helpers/authz')

const lgpdLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
})

router.get('/me/export', lgpdLimiter, verifyToken, LgpdController.exportMe)
router.post('/me/delete', lgpdLimiter, verifyToken, LgpdController.deleteMe)

router.get(
  '/users/:userId/export',
  lgpdLimiter,
  verifyToken,
  requireRole('admin'),
  LgpdController.exportUser
)
router.post(
  '/users/:userId/delete',
  lgpdLimiter,
  verifyToken,
  requireRole('admin'),
  LgpdController.deleteUser
)

module.exports = router

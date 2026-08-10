const express = require('express')
const path = require('path')
const rateLimit = require('express-rate-limit')

const verifyToken = require('../helpers/verify-token')
const { requireRole } = require('../helpers/authz')
const { getStats } = require('../helpers/metrics')
const UserController = require('../controllers/UserController')

const router = express.Router()

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
})

const PRIVATE_DIR = path.join(__dirname, '..', 'private')

/** Valida sessão e role admin. */
router.get('/session', verifyToken, requireRole('admin'), (req, res) => {
  return res.status(200).json({
    ok: true,
    user: {
      id: req.user.id,
      name: req.user.name,
      role: req.user.role,
    },
  })
})

/** HTML completo da dashboard — apenas após autenticação admin. */
router.get('/content', verifyToken, requireRole('admin'), (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  return res.sendFile(path.join(PRIVATE_DIR, 'dashboard-app.html'))
})

/** Métricas operacionais (antes expostas em GET /stats público). */
router.get('/stats', verifyToken, requireRole('admin'), (_req, res) => {
  try {
    return res.json(getStats())
  } catch (e) {
    return res.status(500).json({ error: 'Erro ao obter métricas' })
  }
})

/** Status agregado para a dashboard (processo + banco). */
router.get('/status', verifyToken, requireRole('admin'), (_req, res) => {
  const mongoose = require('mongoose')
  const dbReady = mongoose.connection.readyState === 1
  return res.json({
    health: { status: 'UP' },
    database: dbReady ? 'connected' : 'disconnected',
    ready: dbReady,
  })
})

/** Login reutilizando UserController (mesmo JWT da API). */
router.post('/login', loginLimiter, (req, res, next) => UserController.login(req, res, next))

module.exports = router

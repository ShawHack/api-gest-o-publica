const router = require('express').Router()

const verifyToken = require('../helpers/verify-token')
const {
  attachCulturaContext,
  requireCulturaStaff,
  requireCulturaAdmin,
} = require('../helpers/cultura-auth')
const { culturaPostUploadMiddleware } = require('../helpers/cultura-upload')

const CulturaPostController = require('../controllers/CulturaPostController')
const CulturaCategoryController = require('../controllers/CulturaCategoryController')
const CulturaAssignmentController = require('../controllers/CulturaAssignmentController')
const CulturaSavedEventController = require('../controllers/CulturaSavedEventController')

// ─── Rotas públicas ───────────────────────────────────────────────────────────

router.get('/', CulturaPostController.overview)
router.get('/posts', CulturaPostController.listPublic)
router.get('/posts/:id', CulturaPostController.getByIdPublic)
router.get('/categories', CulturaCategoryController.listPublic)

// ─── Usuário autenticado (qualquer conta SEMIT verificada) ───────────────────

router.get('/me/saved-events', verifyToken, CulturaSavedEventController.listMine)
router.post('/me/saved-events/:postId', verifyToken, CulturaSavedEventController.toggle)

// ─── Admin ───────────────────────────────────────────────────────────────────

const staffChain = [verifyToken, attachCulturaContext, requireCulturaStaff]
const adminChain = [verifyToken, attachCulturaContext, requireCulturaAdmin]

router.get('/admin/dashboard', ...staffChain, CulturaAssignmentController.dashboard)

router.post('/admin/assignments/by-email', ...adminChain, CulturaAssignmentController.createByEmail)
router.get('/admin/assignments', ...adminChain, CulturaAssignmentController.list)
router.post('/admin/assignments', ...adminChain, CulturaAssignmentController.create)
router.delete('/admin/assignments/:id', ...adminChain, CulturaAssignmentController.remove)

router.get('/admin/posts', ...staffChain, CulturaPostController.listAdmin)
router.get('/admin/posts/:id', ...staffChain, CulturaPostController.getByIdAdmin)
router.post('/admin/posts', ...staffChain, culturaPostUploadMiddleware, CulturaPostController.create)
router.put('/admin/posts/:id', ...staffChain, culturaPostUploadMiddleware, CulturaPostController.update)
router.delete('/admin/posts/:id', ...staffChain, CulturaPostController.remove)

router.get('/admin/categories', ...staffChain, CulturaCategoryController.listAdmin)
router.post('/admin/categories', ...adminChain, CulturaCategoryController.create)
router.delete('/admin/categories/:id', ...adminChain, CulturaCategoryController.remove)

module.exports = router

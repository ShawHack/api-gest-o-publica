/**
 * Rotas legadas do portal Cultura montadas em /api (ex.: /api/posts).
 * Leitura pública; escrita exige staff do módulo Cultura.
 */
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
const CulturaSavedEventController = require('../controllers/CulturaSavedEventController')

const staffChain = [verifyToken, attachCulturaContext, requireCulturaStaff]
const adminChain = [verifyToken, attachCulturaContext, requireCulturaAdmin]

router.get('/posts', CulturaPostController.listPublic)
router.get('/posts/:id', CulturaPostController.getByIdPublic)
router.get('/categories', CulturaCategoryController.listPublic)

router.post('/posts', ...staffChain, culturaPostUploadMiddleware, CulturaPostController.create)
router.put('/posts/:id', ...staffChain, culturaPostUploadMiddleware, CulturaPostController.update)
router.delete('/posts/:id', ...staffChain, CulturaPostController.remove)

router.post('/categories', ...adminChain, CulturaCategoryController.create)
router.delete('/categories/:id', ...adminChain, CulturaCategoryController.remove)

router.post('/users/:id/events', verifyToken, (req, res, next) => {
  if (String(req.user.id) !== String(req.params.id)) {
    return res.status(403).json({ message: 'Sem permissão' })
  }
  req.params.postId = req.body.eventId
  return CulturaSavedEventController.toggle(req, res, next)
})

module.exports = router

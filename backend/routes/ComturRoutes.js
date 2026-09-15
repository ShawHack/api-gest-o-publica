const router = require('express').Router()
const ComturMeetingController = require('../controllers/ComturMeetingController')
const ComturBrandingController = require('../controllers/ComturBrandingController')
const ComturContentController = require('../controllers/ComturContentController')
const ComturMapController = require('../controllers/ComturMapController')
const ComturMediaController = require('../controllers/ComturMediaController')
const ComturStaffController = require('../controllers/ComturStaffController')
const { upload: comturUpload } = require('../helpers/comtur-upload')
const verifyToken = require('../helpers/verify-token')
const { requireRole } = require('../helpers/authz')
const { COMTUR_ADMIN_ROLES } = require('../helpers/comtur-roles')

const adminChain = [verifyToken, requireRole(...COMTUR_ADMIN_ROLES)]
function receiveFile(req, res, next) {
  comturUpload(req, res, (err) => {
    if (!err) return next()
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Imagem acima de 25 MB.' : (err.message || 'Falha no envio do arquivo.')
    return res.status(422).json({ error: message })
  })
}

router.get('/branding', ComturBrandingController.getPublic)
router.get('/content', ComturContentController.listPublic)
router.get('/map/locations', ComturContentController.listMap)
router.get('/map/legacy/:id', ComturContentController.getLegacyMapTarget)
router.get('/content/:slug', ComturContentController.getPublic)

// Transparência ativa: somente registros com status published são expostos.
router.get('/meetings', ComturMeetingController.listPublic)
router.get('/meetings/:slug', ComturMeetingController.getBySlug)

router.get('/admin/meetings', ...adminChain, ComturMeetingController.listAdmin)
router.get('/admin/meetings/:id', ...adminChain, ComturMeetingController.getAdminById)
router.post('/admin/meetings', ...adminChain, ComturMeetingController.create)
router.put('/admin/meetings/:id', ...adminChain, ComturMeetingController.update)
router.post('/admin/meetings/:id/transition', ...adminChain, ComturMeetingController.transition)
router.get('/admin/branding', ...adminChain, ComturBrandingController.getAdmin)
router.put('/admin/branding', ...adminChain, ComturBrandingController.update)
router.post('/admin/branding/asset/:kind', ...adminChain, receiveFile, ComturBrandingController.attachAsset)
router.post('/admin/branding/restore/:version', ...adminChain, ComturBrandingController.restore)
router.get('/admin/content', ...adminChain, ComturContentController.listAdmin)
router.get('/admin/map/locations', ...adminChain, ComturMapController.listAdmin)
router.patch('/admin/map/locations/:id/qr', ...adminChain, ComturMapController.updateQr)
router.post('/admin/content', ...adminChain, ComturContentController.create)
router.put('/admin/content/:id', ...adminChain, ComturContentController.update)
router.post('/admin/content/:id/transition', ...adminChain, ComturContentController.transition)
router.post('/admin/media', ...adminChain, receiveFile, ComturMediaController.upload)
router.get('/admin/staff', ...adminChain, ComturStaffController.list)
router.patch('/admin/staff/:id', ...adminChain, ComturStaffController.update)

module.exports = router

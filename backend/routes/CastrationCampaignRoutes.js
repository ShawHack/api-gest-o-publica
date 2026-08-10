const router = require('express').Router()
const CastrationCampaignController = require('../controllers/CastrationCampaignController')
const verifyToken = require('../helpers/verify-token')
const { requireCastrationStaff } = require('../helpers/castration-auth')

router.get('/active', CastrationCampaignController.getActive)

router.use(verifyToken, requireCastrationStaff)

router.get('/', CastrationCampaignController.list)
router.post('/', CastrationCampaignController.create)
router.patch('/:id', CastrationCampaignController.update)
router.post('/:id/open', CastrationCampaignController.open)
router.post('/:id/close', CastrationCampaignController.close)
router.get('/:id/stats', CastrationCampaignController.stats)

module.exports = router

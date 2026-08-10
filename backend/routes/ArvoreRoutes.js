const router = require('express').Router()

const ArvoreController = require('../controllers/ArvoreController')

// middleware
const verifyToken = require('../helpers/verify-token')
const { imageUpload } = require("../helpers/image-upload")

router.post('/create', verifyToken, imageUpload.array("images"), ArvoreController.create)
router.get('/', ArvoreController.getAll)
router.get('/mytrees', verifyToken, ArvoreController.getAllUserTrees)
router.get('/:id', ArvoreController.getTreeById)
router.delete('/:id', verifyToken, ArvoreController.removeTreeById)
router.patch('/status/:id', verifyToken, ArvoreController.updateRequesterStatus)
router.patch('/:id', verifyToken, imageUpload.array("images"), ArvoreController.updateTree)
router.patch('/request/:id', verifyToken, ArvoreController.requestTree)
router.patch('/conclude/:id', verifyToken, ArvoreController.concludeRequest)
router.patch('/cancel/:id', verifyToken, ArvoreController.cancelRequest)

module.exports = router

// routes/dlocRoutes.js
const express = require('express')
const router = express.Router()
const DLocController = require('../controllers/DlocController')

router.get('/:quadra', DLocController.getByQuadra)

module.exports = router

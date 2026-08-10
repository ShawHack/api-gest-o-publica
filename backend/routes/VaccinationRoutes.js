const router = require('express').Router()

const VaccinationController = require('../controllers/VaccinationController')
const verifyToken = require('../helpers/verify-token')

router.post('/pet/:petId/vaccines', verifyToken, VaccinationController.createVaccination)
router.get('/pet/:petId/vaccines', verifyToken, VaccinationController.getVaccinationsByPet)
router.put('/vaccines/:id', verifyToken, VaccinationController.updateVaccination)
router.delete('/vaccines/:id', verifyToken, VaccinationController.deleteVaccination)

module.exports = router

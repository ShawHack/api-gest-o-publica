const router = require('express').Router()

const PetController = require('../controllers/PetController')
const AdoptionRequestController = require('../controllers/AdoptionRequestController')

// middleware
const verifyToken = require('../helpers/verify-token')
const { imageUpload } = require("../helpers/image-upload")

router.get('/admin/adoption-queue', verifyToken, AdoptionRequestController.adminQueue)
router.get('/admin/reports', verifyToken, AdoptionRequestController.adminReports)
router.patch('/admin/:petId/suspend', verifyToken, AdoptionRequestController.suspendPet)

router.post('/create', verifyToken, imageUpload.array("images"), PetController.create)
router.post('/add', verifyToken, imageUpload.array("images"), PetController.create)
router.get('/', PetController.getAll)
router.get('/mypets', verifyToken, PetController.getAllUserPets)
router.get('/myadoptions', verifyToken, PetController.getAllUserAdoptions)
router.post('/:id/adoption-requests', verifyToken, AdoptionRequestController.create)
router.get('/:id/adoption-requests', verifyToken, AdoptionRequestController.listForPet)
router.post('/:id/report', verifyToken, AdoptionRequestController.reportPet)
router.get('/:id/vaccines', verifyToken, PetController.listVaccines)
router.post('/:id/vaccines', verifyToken, PetController.addVaccine)
router.patch('/:id/vaccines/:vaccineId', verifyToken, PetController.updateVaccine)
router.delete('/:id/vaccines/:vaccineId', verifyToken, PetController.removeVaccine)
router.get('/:id', PetController.getPetById)
router.delete('/:id', verifyToken, PetController.removePetById)
router.patch('/status/:id', verifyToken, PetController.updateAdopterStatus)
router.patch('/:id', verifyToken, imageUpload.array("images"), PetController.updatePet)
router.put('/:id', verifyToken, imageUpload.array("images"), PetController.updatePet)
router.patch('/schedule/:id', verifyToken, PetController.schedule)
router.patch('/conclude/:id', verifyToken, PetController.concludeAdoption)
router.patch('/cancel/:id', verifyToken, PetController.cancelAdoption)
router.patch('/cancel-adopter/:id', verifyToken, PetController.cancelAdoptionByAdopter)
router.post('/message/:id', verifyToken, PetController.sendMessage)

module.exports = router

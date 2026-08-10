const router = require('express').Router();
const FormsGarcaController = require('../controllers/FormsGarcaController');
const { upload } = require('../helpers/file-upload');
const verifyToken = require('../helpers/verify-token');

// Health check
router.get('/health', (req, res) => res.status(200).json({ status: 'UP' }));

// ─── FORMULÁRIOS ────────────────────────────
router.get('/forms/statistics', verifyToken, FormsGarcaController.getStatistics);
router.get('/forms', verifyToken, FormsGarcaController.getForms);
router.get('/forms/:id', verifyToken, FormsGarcaController.getFormById);
router.post('/forms', verifyToken, FormsGarcaController.createForm);
router.put('/forms/:id', verifyToken, FormsGarcaController.updateForm);
router.delete('/forms/:id', verifyToken, FormsGarcaController.deleteForm);

// ─── INSCRIÇÕES ─────────────────────────────
router.get('/inscriptions/check', verifyToken, FormsGarcaController.isUserInscribed);
router.get('/inscriptions', verifyToken, FormsGarcaController.getInscriptions);
router.get('/inscriptions/:id', verifyToken, FormsGarcaController.getInscriptionById);
router.post('/inscriptions', verifyToken, FormsGarcaController.createInscription);
router.put('/inscriptions/:id', verifyToken, FormsGarcaController.updateInscription);
router.delete('/inscriptions/:id', verifyToken, FormsGarcaController.deleteInscription);

// ─── UPLOADS ────────────────────────────────
router.post('/upload', verifyToken, upload.single('file'), FormsGarcaController.upload);
router.post('/upload-multiple', verifyToken, upload.array('files', 10), FormsGarcaController.uploadMultiple);

module.exports = router;

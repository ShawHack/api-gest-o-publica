const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const MedicamentosController = require('../controllers/MedicamentosController');
const verifyToken = require('../helpers/verify-token');
const { requireRole } = require('../helpers/authz');

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/', MedicamentosController.listarTodos);
router.get('/resumo', MedicamentosController.resumo);
router.get('/buscar', MedicamentosController.buscarMedicamento);
router.get('/farmacia/:nome', MedicamentosController.listarPorFarmacia);

router.post('/consultar', MedicamentosController.consultar);

router.post(
  '/refresh',
  refreshLimiter,
  verifyToken,
  requireRole('admin'),
  MedicamentosController.refresh
);

module.exports = router;

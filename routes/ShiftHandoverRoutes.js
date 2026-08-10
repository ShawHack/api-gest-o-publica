// routes/ShiftHandoverRoutes.js
const express = require('express');
const router = express.Router();

const ShiftHandoverController = require('../controllers/ShiftHandoverController');
const verifyToken = require('../helpers/verify-token');
const { requireRole } = require('../helpers/authz');

// Todas as rotas requerem autenticação
router.use(verifyToken, requireRole('monitor', 'admin'));

// Criar nova passagem de plantão
router.post('/', ShiftHandoverController.create);

// Listar com filtros e paginação
router.get('/', ShiftHandoverController.list);

// Estatísticas
router.get('/stats', ShiftHandoverController.getStats);

// Histórico
router.get('/history', ShiftHandoverController.getHistory);

// Buscar por ID
router.get('/:id', ShiftHandoverController.getById);

// Atualizar
router.patch('/:id', ShiftHandoverController.update);

// Confirmar recebimento
router.post('/:id/confirm', ShiftHandoverController.confirmReceipt);

// Exportar dados
router.get('/:id/export', ShiftHandoverController.exportData);

// Deletar (apenas admin)
router.delete('/:id', requireRole('admin'), ShiftHandoverController.delete);

module.exports = router;

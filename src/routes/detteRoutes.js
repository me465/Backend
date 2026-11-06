const express = require('express');
const router = express.Router();
const detteController = require('../controllers/detteController');
const clientController = require('../controllers/clientController');
const { authMiddleware, requireRole } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', requireRole(['OWNER', 'MANAGER', 'VENDEUR']), detteController.getDettes);
router.post('/:id/remboursements', requireRole(['OWNER', 'MANAGER', 'VENDEUR']), detteController.createRemboursement);
router.get('/client/:id', requireRole(['OWNER', 'MANAGER', 'VENDEUR']), detteController.getClientDettes);

// Routes clients additionnelles pour supporter la création de clients nécessaires aux dettes
router.post('/clients', requireRole(['OWNER', 'MANAGER', 'VENDEUR']), clientController.createClient);
router.get('/clients', requireRole(['OWNER', 'MANAGER', 'VENDEUR']), clientController.getClients);

module.exports = router;

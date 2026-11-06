const express = require('express');
const router = express.Router();
const venteController = require('../controllers/venteController');
const { authMiddleware, requireRole } = require('../middleware/auth');

router.use(authMiddleware);

router.post('/', requireRole(['OWNER', 'MANAGER', 'VENDEUR']), venteController.createVente);
router.get('/', requireRole(['OWNER', 'MANAGER', 'VENDEUR']), venteController.getVentes);
router.get('/:id', requireRole(['OWNER', 'MANAGER', 'VENDEUR']), venteController.getVenteById);

module.exports = router;

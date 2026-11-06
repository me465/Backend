const express = require('express');
const router = express.Router();
const vendeurController = require('../controllers/vendeurController');
const { authMiddleware, requireRole } = require('../middleware/auth');

// Toutes les routes vendeurs nécessitent d'être authentifié et d'être OWNER ou MANAGER
router.use(authMiddleware);

router.post('/', requireRole(['OWNER', 'MANAGER']), vendeurController.createVendeur);
router.get('/', requireRole(['OWNER', 'MANAGER']), vendeurController.getVendeurs);
router.patch('/:id', requireRole(['OWNER', 'MANAGER']), vendeurController.updateVendeur);
router.delete('/:id', requireRole(['OWNER', 'MANAGER']), vendeurController.deleteVendeur);

module.exports = router;

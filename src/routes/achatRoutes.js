const express = require('express');
const router = express.Router();
const achatController = require('../controllers/achatController');
const { authMiddleware, requireRole } = require('../middleware/auth');

router.use(authMiddleware);

// Entrées en stock / Achats fournisseurs et suivi des achats : réservé à OWNER et MANAGER
router.post('/', requireRole(['OWNER', 'MANAGER']), achatController.createAchat);
router.get('/', requireRole(['OWNER', 'MANAGER']), achatController.getAchats);

module.exports = router;

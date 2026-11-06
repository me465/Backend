const express = require('express');
const router = express.Router();
const rapportController = require('../controllers/rapportController');
const { authMiddleware, requireRole, checkPlan } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/ventes', requireRole(['OWNER', 'MANAGER']), rapportController.getVentesRapport);
router.get('/stock', requireRole(['OWNER', 'MANAGER']), rapportController.getStockRapport);
router.get('/produits-performance', requireRole(['OWNER', 'MANAGER']), rapportController.getProduitsPerformance);

// Route exclusive au pack Business pour les rapports haute gamme
router.get('/insights', requireRole(['OWNER', 'MANAGER']), checkPlan('business'), rapportController.getBusinessInsights);

module.exports = router;

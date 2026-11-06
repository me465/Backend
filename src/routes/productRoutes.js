const express = require('express');
const router = express.Router();
const produitController = require('../controllers/produitController');
const { authMiddleware, requireRole } = require('../middleware/auth');

router.use(authMiddleware);

// Consultation du stock accessible aux vendeurs, managers et propriétaires
router.get('/', produitController.getProduits);
router.get('/alertes-stock', produitController.getAlertesStock);

// Administration et gestion du stock (Ajout, Modification, Ajustement, Suppression) : réservé à MANAGER et OWNER
router.post('/', requireRole(['OWNER', 'MANAGER']), produitController.createProduit);
router.patch('/:id/stock', requireRole(['OWNER', 'MANAGER']), produitController.ajusterStock);
router.post('/:id/stock', requireRole(['OWNER', 'MANAGER']), produitController.ajusterStock);
router.patch('/:id', requireRole(['OWNER', 'MANAGER']), produitController.updateProduit);
router.put('/:id', requireRole(['OWNER', 'MANAGER']), produitController.updateProduit);
router.delete('/:id', requireRole(['OWNER', 'MANAGER']), produitController.deleteProduit);

module.exports = router;

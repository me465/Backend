const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.post('/', clientController.createClient);
router.get('/', clientController.getClients);

module.exports = router;

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', notificationController.getNotifications);
router.patch('/:id/lu', notificationController.markAsRead);
router.post('/check-job', notificationController.checkStockAndDettes); // Déclenchement manuel du job

module.exports = router;

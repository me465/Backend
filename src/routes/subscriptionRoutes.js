const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const subscriptionController = require('../controllers/subscriptionController');

router.use(authMiddleware);

router.get('/status', subscriptionController.getStatus);
router.post('/upgrade', subscriptionController.upgradeToBusiness);
router.post('/upgrade-to-business', subscriptionController.upgradeToBusiness);
router.post('/pay', subscriptionController.paySubscription);
router.post('/subscribe', subscriptionController.paySubscription);
router.get('/history', subscriptionController.getHistory);

module.exports = router;

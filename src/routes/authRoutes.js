const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  changePassword, 
  verifyOTP, 
  sendOTP,
  sendEmailOTP,
  verifyEmailOTP
} = require('../controllers/authController');
const { upgradeToBusiness } = require('../controllers/subscriptionController');
const { authMiddleware } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/send-email-otp', sendEmailOTP);
router.post('/verify-email-otp', verifyEmailOTP);

// Route aliases for frontend and mobile SDK compatibility
router.post('/otp/send', sendOTP);
router.post('/otp/verify', verifyOTP);
router.post('/otp', sendOTP);
router.post('/sendOTP', sendOTP);
router.post('/verifyOTP', verifyOTP);

router.post('/change-password', changePassword);
router.post('/upgrade-to-business', authMiddleware, upgradeToBusiness);

module.exports = router;

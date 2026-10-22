const express = require('express');
const router = express.Router();
const { register, login, sendOTP, verifyOTP, resendOTP, checkRole, googleAuth } = require('../controllers/authController');
const { authLimiter, otpVerifyLimiter } = require('../middleware/rateLimit');

router.use(authLimiter);

// @route   POST /api/auth/check-role
// @desc    Check user role before login
// @access  Public
router.post('/check-role', checkRole);

// @route   POST /api/auth/google
// @desc    Sign in / sign up with a Google ID token
// @access  Public
router.post('/google', googleAuth);

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', register);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', login);

// @route   POST /api/auth/send-otp
// @desc    Send OTP to phone/email
// @access  Public
router.post('/send-otp', sendOTP);

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP
// @access  Public
router.post('/verify-otp', otpVerifyLimiter, verifyOTP);

// @route   POST /api/auth/resend-otp
// @desc    Resend OTP
// @access  Public
router.post('/resend-otp', resendOTP);

module.exports = router;


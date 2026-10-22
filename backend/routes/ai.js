const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimit');
const { uploadMultiple } = require('../utils/cloudinary');
const {
  getStatus,
  listingAssist,
  bikeDocumentCheck,
  licenseCheck,
  damageCheck,
  chat
} = require('../controllers/aiController');

// @route   GET /api/ai/status
// @desc    Whether AI features are enabled
// @access  Public
router.get('/status', getStatus);

// @route   POST /api/ai/chat
// @desc    RydZo assistant chat (bike search + how-to answers)
// @access  Public (rate limited)
router.post('/chat', aiLimiter, chat);

// @route   POST /api/ai/listing-assist
// @desc    Draft bike description and suggest pricing
// @access  Private (Owner)
router.post('/listing-assist', auth, authorize('owner'), aiLimiter, listingAssist);

// @route   POST /api/ai/bookings/:id/damage-check
// @desc    Upload return photos and compare with before photos
// @access  Private (Owner of booking / Admin)
router.post('/bookings/:id/damage-check', auth, aiLimiter, uploadMultiple('photos', 4), damageCheck);

// @route   POST /api/ai/bikes/:id/document-check
// @desc    Read RC / insurance / PUC and flag mismatches
// @access  Private (Admin)
router.post('/bikes/:id/document-check', auth, authorize('admin'), bikeDocumentCheck);

// @route   POST /api/ai/users/:id/license-check
// @desc    Read driving licence and compare with profile
// @access  Private (Admin)
router.post('/users/:id/license-check', auth, authorize('admin'), licenseCheck);

module.exports = router;

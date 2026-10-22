const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  getProfile,
  updateProfile,
  uploadDrivingLicense,
  uploadSelfie,
  uploadOwnerDocuments,
  getCustomerStatus,
  getOwnerStatus,
  uploadCustomerIdentity,
  uploadCustomerProfilePhoto
} = require('../controllers/userController');
const { uploadSingle, uploadMultiple, uploadToCloudinary } = require('../utils/cloudinary');

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', auth, getProfile);

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, updateProfile);

// @route   POST /api/users/customer/driving-license
// @desc    Upload driving license (Customer)
// @access  Private (Customer)
router.post('/customer/driving-license', auth, uploadSingle('document'), uploadDrivingLicense);

// @route   POST /api/users/customer/selfie
// @desc    Upload selfie (Customer)
// @access  Private (Customer)
router.post('/customer/selfie', auth, uploadSingle('selfie'), uploadSelfie);

// @route   POST /api/users/customer/identity
// @desc    Upload customer identity documents
// @access  Private (Customer)
router.post('/customer/identity', auth, uploadSingle('document'), uploadCustomerIdentity);

// @route   POST /api/users/profile-photo
// @desc    Upload profile photo (customer, owner or admin)
// @access  Private
router.post('/profile-photo', auth, uploadSingle('profilePhoto'), uploadCustomerProfilePhoto);

// @route   POST /api/users/customer/profile-photo
// @desc    Older path for the same upload, kept for existing clients
// @access  Private
router.post('/customer/profile-photo', auth, uploadSingle('profilePhoto'), uploadCustomerProfilePhoto);

// @route   POST /api/users/owner/documents
// @desc    Upload owner documents (Aadhaar/PAN, RC, Insurance, PUC)
// @access  Private (Owner)
router.post('/owner/documents', auth, uploadMultiple('documents', 10), uploadOwnerDocuments);

// @route   GET /api/users/customer/status
// @desc    Get customer verification status
// @access  Private (Customer)
router.get('/customer/status', auth, getCustomerStatus);

// @route   GET /api/users/owner/status
// @desc    Get owner verification status
// @access  Private (Owner)
router.get('/owner/status', auth, getOwnerStatus);

module.exports = router;


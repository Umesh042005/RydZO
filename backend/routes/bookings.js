const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  createBooking,
  getBookings,
  getBookingById,
  getCustomerBookings,
  getOwnerBookings,
  updateBookingStatus,
  markAdvancePaymentPaid,
  submitRequestToOwner,
  ownerRespondToBooking,
  authorizeSecurityDeposit,
  collectSecurityDeposit,
  startRental,
  endRental,
  cancelBooking,
  updateBooking
} = require('../controllers/bookingController');

// @route   POST /api/bookings
// @desc    Create new booking
// @access  Private (Customer)
router.post('/', auth, createBooking);

// @route   PUT /api/bookings/:id
// @desc    Update booking details (dates/times)
// @access  Private
router.put('/:id', auth, updateBooking);

// @route   GET /api/bookings
// @desc    Get all bookings (Admin)
// @access  Private (Admin)
router.get('/', auth, getBookings);

// @route   GET /api/bookings/customer
// @desc    Get customer bookings
// @access  Private (Customer)
router.get('/customer', auth, getCustomerBookings);

// @route   GET /api/bookings/owner
// @desc    Get owner bookings
// @access  Private (Owner)
router.get('/owner', auth, getOwnerBookings);

// @route   GET /api/bookings/:id
// @desc    Get booking by ID
// @access  Private
router.get('/:id', auth, getBookingById);

// @route   POST /api/bookings/:id/advance-payment
// @desc    Mark advance payment as paid (placeholder)
// @access  Private (Customer)
router.post('/:id/advance-payment', auth, markAdvancePaymentPaid);

// @route   POST /api/bookings/:id/submit-request
// @desc    Send booking request to owner (after agreement + advance payment)
// @access  Private (Customer)
router.post('/:id/submit-request', auth, submitRequestToOwner);

// @route   POST /api/bookings/:id/owner/respond
// @desc    Owner accepts/declines booking request
// @access  Private (Owner)
router.post('/:id/owner/respond', auth, ownerRespondToBooking);

// @route   POST /api/bookings/:id/security-deposit/authorize
// @desc    Customer authorizes security deposit (Dummy step)
// @access  Private (Customer)
router.post('/:id/security-deposit/authorize', auth, authorizeSecurityDeposit);
router.post('/:id/authorize-deposit', auth, authorizeSecurityDeposit);

// @route   POST /api/bookings/:id/security-deposit/collect
// @desc    Owner marks security deposit collected at handover
// @access  Private (Owner)
router.post('/:id/security-deposit/collect', auth, collectSecurityDeposit);

// @route   PUT /api/bookings/:id/status
// @desc    Update booking status
// @access  Private
router.put('/:id/status', auth, updateBookingStatus);

// @route   POST /api/bookings/:id/start
// @desc    Start rental
// @access  Private
router.post('/:id/start', auth, startRental);

// @route   POST /api/bookings/:id/end
// @desc    End rental
// @access  Private
router.post('/:id/end', auth, endRental);

// @route   POST /api/bookings/:id/cancel
// @desc    Cancel booking
// @access  Private
router.post('/:id/cancel', auth, cancelBooking);

module.exports = router;


const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const {
  approveCustomer,
  rejectCustomer,
  approveOwner,
  rejectOwner,
  approveBike,
  rejectBike,
  getAllCustomers,
  getAllOwners,
  getAllBikes,
  getPendingApprovals,
  blockUser,
  unblockUser,
  getLiveRentals,
  handleDispute,
  getDashboardStats,
  getAllBookings,
  adminLogin
} = require('../controllers/adminController');

// @route   POST /api/admin/login
// @desc    Admin login directly
// @access  Public
router.post('/login', adminLogin);

// All routes below require admin authentication and role
router.use(auth);
router.use(authorize('admin'));

// @route   GET /api/admin/dashboard
// @desc    Get dashboard statistics
// @access  Private (Admin)
router.get('/dashboard', getDashboardStats);

// @route   GET /api/admin/bookings
// @desc    Get all bookings with filters (Admin)
// @access  Private (Admin)
router.get('/bookings', getAllBookings);

// @route   GET /api/admin/pending-approvals
// @desc    Get all pending approvals
// @access  Private (Admin)
router.get('/pending-approvals', getPendingApprovals);

// Customer approvals
router.put('/customers/:id/approve', approveCustomer);
router.put('/customers/:id/reject', rejectCustomer);
router.get('/customers', getAllCustomers);

// Owner approvals
router.put('/owners/:id/approve', approveOwner);
router.put('/owners/:id/reject', rejectOwner);
router.get('/owners', getAllOwners);

// Bike approvals
router.put('/bikes/:id/approve', approveBike);
router.put('/bikes/:id/reject', rejectBike);
router.get('/bikes', getAllBikes);

// User management
router.put('/users/:id/block', blockUser);
router.put('/users/:id/unblock', unblockUser);

// Live rentals
router.get('/live-rentals', getLiveRentals);

// Disputes
router.put('/disputes/:bookingId/resolve', handleDispute);

module.exports = router;


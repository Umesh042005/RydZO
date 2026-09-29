const User = require('../models/User');
const Bike = require('../models/Bike');
const Booking = require('../models/Booking');
const DamageProof = require('../models/DamageProof');
const jwt = require('jsonwebtoken');

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'rydzo_secret_key', {
    expiresIn: '30d'
  });
};

// @desc    Admin login directly
// @route   POST /api/admin/login
// @access  Public
exports.adminLogin = async (req, res) => {
  try {
    const { phone, email, password } = req.body;

    if ((!phone && !email) || !password) {
      return res.status(400).json({ message: 'Please provide phone/email and password' });
    }

    const user = await User.findOne({
      $or: [
        phone ? { phone } : null,
        email ? { email } : null
      ].filter(Boolean)
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    // Role check: must be admin
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied: Admin credentials required' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    const token = generateToken(user._id);

    res.json({
      message: 'Admin login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private (Admin)
exports.getDashboardStats = async (req, res) => {
  try {
    const [
      totalCustomers,
      totalOwners,
      totalBikes,
      totalBookings,
      pendingCustomers,
      pendingOwners,
      pendingBikes,
      liveRentals,
      completedBookings,
      approvedBikes,
      activeAvailableBikes,
      hiddenOrInactiveBikes,
      pendingBookingDrafts,
      pendingOwnerRequests,
      confirmedBookings,
      cancelledBookings,
      bookedBikesDistinct,
      runningBikesDistinct
    ] = await Promise.all([
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({ role: 'owner' }),
      Bike.countDocuments(),
      Booking.countDocuments(),
      User.countDocuments({ role: 'customer', customerApprovalStatus: 'pending' }),
      User.countDocuments({ role: 'owner', ownerApprovalStatus: 'pending' }),
      Bike.countDocuments({ approvalStatus: 'pending' }),
      Booking.countDocuments({ status: 'ongoing' }),
      Booking.countDocuments({ status: 'completed' }),
      Bike.countDocuments({ approvalStatus: 'approved' }),
      Bike.countDocuments({ approvalStatus: 'approved', status: 'active', isAvailable: true }),
      Bike.countDocuments({
        approvalStatus: 'approved',
        $or: [{ status: { $ne: 'active' } }, { isAvailable: false }]
      }),
      // Draft: booking created but not yet sent to owner (agreement/payment steps)
      Booking.countDocuments({ status: 'pending', isSentToOwner: false }),
      // Requests waiting for owner decision
      Booking.countDocuments({ status: 'pending', isSentToOwner: true, 'ownerDecision.status': 'pending' }),
      Booking.countDocuments({ status: 'confirmed' }),
      Booking.countDocuments({ status: 'cancelled' }),
      Booking.distinct('bike', { status: { $in: ['confirmed', 'ongoing'] } }).then((x) => x.length),
      Booking.distinct('bike', { status: 'ongoing' }).then((x) => x.length)
    ]);

    res.json({
      totalCustomers,
      totalOwners,
      totalBikes,
      totalBookings,
      pendingCustomers,
      pendingOwners,
      pendingBikes,
      liveRentals,
      completedBookings,
      approvedBikes,
      activeAvailableBikes,
      hiddenOrInactiveBikes,
      pendingBookingDrafts,
      pendingOwnerRequests,
      confirmedBookings,
      cancelledBookings,
      bookedBikesDistinct,
      runningBikesDistinct
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all bookings (Admin) with filters
// @route   GET /api/admin/bookings
// @access  Private (Admin)
exports.getAllBookings = async (req, res) => {
  try {
    const {
      status,
      sentToOwner,
      ownerDecisionStatus,
      agreementAccepted,
      advancePaymentStatus,
      securityDepositStatus
    } = req.query || {};

    const query = {};

    if (status) query.status = status;

    if (sentToOwner === 'true') query.isSentToOwner = true;
    if (sentToOwner === 'false') query.isSentToOwner = false;

    if (ownerDecisionStatus) query['ownerDecision.status'] = ownerDecisionStatus;

    if (agreementAccepted === 'true') query.agreementAccepted = true;
    if (agreementAccepted === 'false') query.agreementAccepted = false;

    if (advancePaymentStatus) query['advancePayment.status'] = advancePaymentStatus;

    if (securityDepositStatus) query.securityDepositStatus = securityDepositStatus;

    const bookings = await Booking.find(query)
      .populate('customer', 'name phone email')
      .populate('owner', 'name phone email')
      .populate('bike', 'bikeNumber brand model status isAvailable approvalStatus')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    console.error('Get all bookings (admin) error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get pending approvals
// @route   GET /api/admin/pending-approvals
// @access  Private (Admin)
exports.getPendingApprovals = async (req, res) => {
  try {
    const [pendingCustomers, pendingOwners, pendingBikes] = await Promise.all([
      User.find({
        role: 'customer',
        customerApprovalStatus: 'pending'
      }).select('-password'),
      User.find({
        role: 'owner',
        ownerApprovalStatus: 'pending'
      }).select('-password'),
      Bike.find({ approvalStatus: 'pending' }).populate('owner', 'name phone')
    ]);

    res.json({
      customers: pendingCustomers,
      owners: pendingOwners,
      bikes: pendingBikes
    });
  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Approve customer
// @route   PUT /api/admin/customers/:id/approve
// @access  Private (Admin)
exports.approveCustomer = async (req, res) => {
  try {
    const { note } = req.body;
    const user = await User.findById(req.params.id);

    if (!user || user.role !== 'customer') {
      return res.status(404).json({ message: 'Customer not found' });
    }

    user.customerApprovalStatus = 'approved';

    // Approve all uploaded documents
    if (user.drivingLicense && user.drivingLicense.documentUrl) {
      user.drivingLicense.verified = true;
      user.drivingLicense.status = 'approved';
    }
    if (user.selfieUrl) user.selfieStatus = 'approved';
    if (user.aadhaarDocumentUrl) user.aadhaarStatus = 'approved';
    if (user.panDocumentUrl) user.panStatus = 'approved';
    if (user.profileImage) user.profilePhotoStatus = 'approved';

    if (note) user.customerApprovalNote = note;
    await user.save();

    res.json({ message: 'Customer approved successfully', user });
  } catch (error) {
    console.error('Approve customer error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Reject customer
// @route   PUT /api/admin/customers/:id/reject
// @access  Private (Admin)
exports.rejectCustomer = async (req, res) => {
  try {
    const note = req.body.reason || req.body.note;
    if (!note) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    const user = await User.findById(req.params.id);

    if (!user || user.role !== 'customer') {
      return res.status(404).json({ message: 'Customer not found' });
    }

    user.customerApprovalStatus = 'rejected';
    user.isVerified = false;
    user.customerApprovalNote = note;

    // Reject pending documents
    if (user.drivingLicense?.status === 'pending') {
      user.drivingLicense.status = 'rejected';
      user.drivingLicense.rejectionReason = note;
    }
    if (user.selfieStatus === 'pending') {
      user.selfieStatus = 'rejected';
      user.selfieRejectionReason = note;
    }
    if (user.aadhaarStatus === 'pending') {
      user.aadhaarStatus = 'rejected';
      user.aadhaarRejectionReason = note;
    }
    if (user.panStatus === 'pending') {
      user.panStatus = 'rejected';
      user.panRejectionReason = note;
    }
    if (user.profilePhotoStatus === 'pending') {
      user.profilePhotoStatus = 'rejected';
      user.profilePhotoRejectionReason = note;
    }

    await user.save();

    res.json({ message: 'Customer rejected', user });
  } catch (error) {
    console.error('Reject customer error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Approve owner
// @route   PUT /api/admin/owners/:id/approve
// @access  Private (Admin)
exports.approveOwner = async (req, res) => {
  try {
    const { note } = req.body;
    const user = await User.findById(req.params.id);

    if (!user || user.role !== 'owner') {
      return res.status(404).json({ message: 'Owner not found' });
    }

    user.ownerApprovalStatus = 'approved';
    user.isVerified = true;
    user.isActive = true;
    if (user.aadhaarDocumentUrl) user.aadhaarStatus = 'approved';
    if (user.panDocumentUrl) user.panStatus = 'approved';

    if (note) user.ownerApprovalNote = note;
    await user.save();

    res.json({ message: 'Owner approved successfully', user });
  } catch (error) {
    console.error('Approve owner error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Reject owner
// @route   PUT /api/admin/owners/:id/reject
// @access  Private (Admin)
exports.rejectOwner = async (req, res) => {
  try {
    const note = req.body.reason || req.body.note;
    if (!note) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    const user = await User.findById(req.params.id);

    if (!user || user.role !== 'owner') {
      return res.status(404).json({ message: 'Owner not found' });
    }

    user.ownerApprovalStatus = 'rejected';
    user.isVerified = false;
    user.ownerApprovalNote = note;
    await user.save();

    res.json({ message: 'Owner rejected', user });
  } catch (error) {
    console.error('Reject owner error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Approve bike
// @route   PUT /api/admin/bikes/:id/approve
// @access  Private (Admin)
exports.approveBike = async (req, res) => {
  try {
    const { note } = req.body;
    const bike = await Bike.findById(req.params.id);

    if (!bike) {
      return res.status(404).json({ message: 'Bike not found' });
    }

    // // Verify documents
    // if (!bike.documents.rc?.documentUrl) {
    //   return res.status(400).json({ message: 'RC document is required' });
    // }

    // if (!bike.documents.puc?.documentUrl) {
    //   return res.status(400).json({ message: 'PUC document is required' });
    // }

    bike.approvalStatus = 'approved';
    bike.isAvailable = true; // Make it available immediately upon approval

    // If admin chooses to approve without documentation, avoid crashing.
    // Only mark documents verified when they actually exist.
    bike.documents = bike.documents || {};
    bike.documents.rc = bike.documents.rc || {};
    bike.documents.puc = bike.documents.puc || {};
    bike.documents.insurance = bike.documents.insurance || {};

    bike.documents.rc.verified = !!bike.documents.rc.documentUrl;
    bike.documents.puc.verified = !!bike.documents.puc.documentUrl;
    if (bike.documents.insurance.documentUrl) {
      bike.documents.insurance.verified = true;
    }
    if (note) bike.approvalNote = note;
    await bike.save();

    res.json({ message: 'Bike approved successfully', bike });
  } catch (error) {
    console.error('Approve bike error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Reject bike
// @route   PUT /api/admin/bikes/:id/reject
// @access  Private (Admin)
exports.rejectBike = async (req, res) => {
  try {
    const note = req.body.reason || req.body.note;
    if (!note) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    const bike = await Bike.findById(req.params.id);

    if (!bike) {
      return res.status(404).json({ message: 'Bike not found' });
    }

    bike.approvalStatus = 'rejected';
    bike.isAvailable = false;
    bike.approvalNote = note;
    await bike.save();

    res.json({ message: 'Bike rejected', bike });
  } catch (error) {
    console.error('Reject bike error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all customers
// @route   GET /api/admin/customers
// @access  Private (Admin)
exports.getAllCustomers = async (req, res) => {
  try {
    const customers = await User.find({ role: 'customer' })
      .select('-password -otp')
      .sort({ createdAt: -1 });

    res.json(customers);
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all owners
// @route   GET /api/admin/owners
// @access  Private (Admin)
exports.getAllOwners = async (req, res) => {
  try {
    const owners = await User.find({ role: 'owner' })
      .select('-password -otp')
      .sort({ createdAt: -1 });

    res.json(owners);
  } catch (error) {
    console.error('Get owners error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all bikes
// @route   GET /api/admin/bikes
// @access  Private (Admin)
exports.getAllBikes = async (req, res) => {
  try {
    const bikes = await Bike.find()
      .populate('owner', 'name phone email')
      .sort({ createdAt: -1 })
      .lean();

    // Check active bookings to determine live/booking state
    const bikeIds = bikes.map(b => b._id);
    const activeBookings = await Booking.find({
      bike: { $in: bikeIds },
      status: { $in: ['confirmed', 'ongoing'] }
    }).sort({ createdAt: -1 });

    const bookingByBike = {};
    activeBookings.forEach(b => {
      if (!bookingByBike[b.bike.toString()]) {
        bookingByBike[b.bike.toString()] = b;
      }
    });

    const enrichedBikes = bikes.map(b => {
      const activeBooking = bookingByBike[b._id.toString()];
      let rentalStatus = 'Available';
      if (activeBooking) {
        rentalStatus = activeBooking.status === 'ongoing' ? 'Ongoing' : 'Confirmed';
      } else if (!b.isAvailable) {
        rentalStatus = 'Unavailable';
      }
      return {
        ...b,
        currentBooking: activeBooking || null,
        rentalStatus
      };
    });

    res.json(enrichedBikes);
  } catch (error) {
    console.error('Get bikes error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Block user
// @route   PUT /api/admin/users/:id/block
// @access  Private (Admin)
exports.blockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isActive = false;
    await user.save();

    res.json({ message: 'User blocked successfully', user });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Unblock user
// @route   PUT /api/admin/users/:id/unblock
// @access  Private (Admin)
exports.unblockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isActive = true;
    await user.save();

    res.json({ message: 'User unblocked successfully', user });
  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get live rentals
// @route   GET /api/admin/live-rentals
// @access  Private (Admin)
exports.getLiveRentals = async (req, res) => {
  try {
    const rentals = await Booking.find({ status: 'ongoing' })
      .populate('customer', 'name phone')
      .populate('owner', 'name phone')
      .populate('bike', 'bikeNumber brand model')
      .sort({ startTime: -1 });

    res.json(rentals);
  } catch (error) {
    console.error('Get live rentals error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Handle dispute
// @route   PUT /api/admin/disputes/:bookingId/resolve
// @access  Private (Admin)
exports.handleDispute = async (req, res) => {
  try {
    const { resolution, notes, resolutionAmount } = req.body;
    const booking = await Booking.findById(req.params.bookingId);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    booking.status = 'disputed';
    booking.adminNotes = notes;
    await booking.save();

    // Update damage proof if exists
    const damageProof = await DamageProof.findOne({ booking: booking._id });
    if (damageProof) {
      damageProof.adminReviewed = true;
      damageProof.adminReviewStatus = resolution;
      damageProof.adminNotes = notes;
      damageProof.resolutionStatus = 'resolved';
      damageProof.resolutionAmount = resolutionAmount || 0;
      damageProof.resolvedAt = new Date();
      await damageProof.save();
    }

    res.json({ message: 'Dispute resolved', booking, damageProof });
  } catch (error) {
    console.error('Handle dispute error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


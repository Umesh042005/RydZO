const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bike: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bike',
    required: true
  },
  bookingType: {
    type: String,
    enum: ['hourly', 'daily'],
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  startTimeStr: {
    type: String
  },
  endTimeStr: {
    type: String
  },
  duration: {
    hours: Number,
    days: Number
  },
  // Pricing
  hourlyRate: Number,
  dailyRate: Number,
  totalAmount: {
    type: Number,
    required: true
  },
  securityDeposit: {
    type: Number,
    required: true
  },
  commission: {
    type: Number,
    default: 0
  },
  // Status
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'ongoing', 'completed', 'cancelled', 'disputed'],
    default: 'pending'
  },
  // Handover details
  handoverLocation: {
    address: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  handoverTime: Date,
  actualHandoverTime: Date,
  // Return details
  returnTime: Date,
  actualReturnTime: Date,
  returnLocation: {
    address: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  // Tracking
  isTrackingActive: {
    type: Boolean,
    default: false
  },
  trackingLocations: [{
    lat: Number,
    lng: Number,
    timestamp: Date
  }],
  // Digital Agreement
  agreementAccepted: {
    type: Boolean,
    default: false
  },
  agreementTimestamp: Date,
  agreementIP: String,
  // Damage proof
  damageProof: {
    startPhotos: [String],
    endPhotos: [String],
    damageReported: { type: Boolean, default: false },
    damageDescription: String,
    adminReviewed: { type: Boolean, default: false }
  },
  // Payment (future integration)
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'refunded', 'partial'],
    default: 'pending'
  },
  /* ---------------- Booking request workflow ---------------- */
  // Booking is created first; once customer accepts agreement + pays advance,
  // they "send request" to owner. Only then owner should see/respond.
  isSentToOwner: {
    type: Boolean,
    default: false
  },
  sentToOwnerAt: Date,
  ownerDecision: {
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending'
    },
    note: String,
    decidedAt: Date
  },
  /* ---------------- Advance payment (removed per request) ---------------- */
  advancePayment: {
    requiredAmount: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'paid', 'not_required'],
      default: 'not_required'
    },
    transactionId: String,
    paidAt: Date
  },
  /* ---------------- Final Calculations ---------------- */
  finalTotalAmount: Number,
  finalCommission: Number,
  finalOwnerPayout: Number,
  paymentMethod: {
    type: String,
    enum: ['online', 'manual'],
    default: 'manual'
  },
  isPaymentCollectedManually: {
    type: Boolean,
    default: false
  },
  /* ---------------- Security deposit collection at handover ---------------- */
  // Security deposit is typically collected by owner at handover.
  securityDepositStatus: {
    type: String,
    enum: ['pending', 'authorized', 'collected', 'refunded', 'forfeited'],
    default: 'pending'
  },
  securityDepositCollectedAt: Date,
  securityDepositCollectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Notes
  customerNotes: String,
  ownerNotes: String,
  adminNotes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
bookingSchema.index({ customer: 1 });
bookingSchema.index({ owner: 1 });
bookingSchema.index({ bike: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ startDate: 1, endDate: 1 });
bookingSchema.index({ isSentToOwner: 1, 'ownerDecision.status': 1 });

module.exports = mongoose.model('Booking', bookingSchema);


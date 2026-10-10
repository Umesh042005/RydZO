const mongoose = require('mongoose');

const agreementSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
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
  // Agreement content
  agreementText: {
    type: String,
    required: true
  },
  // Consent flags
  consentFlags: {
    locationTracking: { type: Boolean, default: false },
    geoFencing: { type: Boolean, default: false },
    damageResponsibility: { type: Boolean, default: false },
    lateReturnPenalty: { type: Boolean, default: false },
    theftFIR: { type: Boolean, default: false },
    securityDeposit: { type: Boolean, default: false },
    ownerHandover: { type: Boolean, default: false },
    aggregatorDisclaimer: { type: Boolean, default: false }
  },
  // Acceptance
  accepted: {
    type: Boolean,
    default: false
  },
  acceptanceMethod: {
    type: String,
    enum: ['checkbox', 'otp'],
    default: 'checkbox'
  },
  otp: String,
  otpExpiry: Date,
  otpAttempts: {
    type: Number,
    default: 0
  },
  otpVerified: {
    type: Boolean,
    default: false
  },
  // Metadata
  userIP: String,
  userAgent: String,
  acceptedAt: Date,
  // Version tracking
  version: {
    type: String,
    default: '1.0'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
agreementSchema.index({ booking: 1 });
agreementSchema.index({ customer: 1 });

// The accepted text is the legal record of what the customer consented to; it must never change afterwards.
agreementSchema.pre('save', function (next) {
  if (!this.isNew && this.accepted && !this.isModified('accepted') && this.isModified('agreementText')) {
    return next(new Error('Agreement text cannot be changed after acceptance'));
  }
  next();
});

// The OTP is a secret for the customer only; the owner can also read this agreement.
agreementSchema.set('toJSON', {
  transform(doc, ret) {
    delete ret.otp;
    delete ret.otpExpiry;
    delete ret.otpAttempts;
    return ret;
  }
});

module.exports = mongoose.model('Agreement', agreementSchema);


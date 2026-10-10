const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    unique: true,
    sparse: true,
    required: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['customer', 'owner', 'admin'],
    default: 'customer'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Customer specific fields
  drivingLicense: {
    number: String,
    documentUrl: String,
    verified: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'not_uploaded'],
      default: 'not_uploaded'
    },
    rejectionReason: String
  },
  selfieUrl: String,
  selfieStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'not_uploaded'],
    default: 'not_uploaded'
  },
  selfieRejectionReason: String,

  // Verification Documents (Shared/Customer/Owner)
  aadhaarNumber: String,
  aadhaarDocumentUrl: String,
  aadhaarStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'not_uploaded'],
    default: 'not_uploaded'
  },
  aadhaarRejectionReason: String,

  panNumber: String,
  panDocumentUrl: String,
  panStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'not_uploaded'],
    default: 'not_uploaded'
  },
  panRejectionReason: String,

  profilePhotoStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'not_uploaded'],
    default: 'not_uploaded'
  },
  profilePhotoRejectionReason: String,

  customerApprovalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  customerApprovalNote: String,
  // Owner specific fields
  ownerApprovalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  ownerApprovalNote: String,
  // OTP fields
  otp: String,
  otpExpiry: Date,
  // Profile
  profileImage: String,
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Never serialize secrets. Government ID numbers are only included when a caller
// opts in per document (admin KYC review) via user.$locals.includeKyc = true.
userSchema.set('toJSON', {
  transform(doc, ret) {
    delete ret.password;
    delete ret.otp;
    delete ret.otpExpiry;
    if (!doc.$locals?.includeKyc) {
      delete ret.aadhaarNumber;
      delete ret.panNumber;
    }
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);


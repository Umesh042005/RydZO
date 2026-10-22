const User = require('../models/User');
const { uploadToCloudinary } = require('../utils/cloudinary');
const { missingBookingDocs } = require('../utils/bookingEligibility');
const Notification = require('../models/Notification');

// Helper to notify admins
const notifyAdmins = async (message, relatedId = null) => {
  try {
    const admins = await User.find({ role: 'admin' });
    const notifications = admins.map(admin => ({
      recipient: admin._id,
      type: 'general',
      message,
      relatedId
    }));
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }
  } catch (error) {
    console.error('Failed to notify admins:', error);
  }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -otp');
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { name, email, address, profileImage, phone } = req.body;
    const user = await User.findById(req.user._id);

    // Google sign-in accounts start without a phone; they add it here (e.g. at booking).
    if (phone !== undefined && phone !== user.phone) {
      const normalized = String(phone).replace(/\D/g, '').slice(-10);
      if (!/^[6-9]\d{9}$/.test(normalized)) {
        return res.status(400).json({ message: 'Please enter a valid 10-digit mobile number' });
      }
      const taken = await User.exists({ phone: normalized, _id: { $ne: user._id } });
      if (taken) {
        return res.status(400).json({ message: 'This phone number is already used by another account' });
      }
      user.phone = normalized;
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (address) user.address = address;
    if (profileImage) user.profileImage = profileImage;

    user.updatedAt = new Date();
    await user.save();

    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Upload driving license (Customer)
// @route   POST /api/users/customer/driving-license
// @access  Private (Customer)
exports.uploadDrivingLicense = async (req, res) => {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ message: 'Access denied. Customer only.' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a document' });
    }

    const { licenseNumber } = req.body;
    if (!licenseNumber) {
      return res.status(400).json({ message: 'Please provide license number' });
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.path, 'rydzo/documents/driving-license');

    const user = await User.findById(req.user._id);
    user.drivingLicense = {
      number: licenseNumber,
      documentUrl: result.secure_url,
      verified: false,
      status: 'pending'
    };
    user.customerApprovalStatus = 'pending';
    user.customerApprovalNote = ''; // Clear strict notes on re-upload if desired
    await user.save();

    await notifyAdmins(`New Driving License uploaded by ${req.user.name}`, req.user._id);

    res.json({
      message: 'Driving license uploaded successfully. Waiting for admin approval.',
      documentUrl: result.secure_url
    });
  } catch (error) {
    console.error('Upload DL error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Upload selfie (Customer)
// @route   POST /api/users/customer/selfie
// @access  Private (Customer)
exports.uploadSelfie = async (req, res) => {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ message: 'Access denied. Customer only.' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a selfie' });
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.path, 'rydzo/selfies');

    const user = await User.findById(req.user._id);
    user.selfieUrl = result.secure_url;
    user.selfieStatus = 'pending';
    user.customerApprovalStatus = 'pending';
    await user.save();

    await notifyAdmins(`New Selfie uploaded by ${req.user.name}`, req.user._id);

    res.json({
      message: 'Selfie uploaded successfully',
      selfieUrl: result.secure_url
    });
  } catch (error) {
    console.error('Upload selfie error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Upload customer identity documents (Aadhaar/PAN)
// @route   POST /api/users/customer/identity
// @access  Private (Customer)
exports.uploadCustomerIdentity = async (req, res) => {
  try {
    if (!['owner', 'customer'].includes(req.user.role)) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a document' });
    }

    const { type } = req.body;
    // Customers send `number`; the owner profile form sends aadhaarNumber/panNumber.
    const number = req.body.number || (type === 'aadhaar' ? req.body.aadhaarNumber : req.body.panNumber);
    if (!['aadhaar', 'pan'].includes(type)) {
      return res.status(400).json({ message: 'Invalid document type' });
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.path, `rydzo/documents/${type}`);

    const user = await User.findById(req.user._id);

    if (type === 'aadhaar') {
      user.aadhaarDocumentUrl = result.secure_url;
      user.aadhaarStatus = 'pending';
      if (number) user.aadhaarNumber = number;
    } else if (type === 'pan') {
      user.panDocumentUrl = result.secure_url;
      user.panStatus = 'pending';
      if (number) user.panNumber = number;
    }

    // Re-uploading sends the account back to the admin review queue for its own role
    // (a rejected owner previously stayed rejected because only the customer status was reset).
    if (user.role === 'owner') {
      user.ownerApprovalStatus = 'pending';
    } else {
      user.customerApprovalStatus = 'pending';
    }
    await user.save();

    await notifyAdmins(`New ${type.toUpperCase()} uploaded by ${req.user.name}`, req.user._id);

    res.json({
      message: `${type.toUpperCase()} uploaded successfully`,
      url: result.secure_url,
      status: 'pending'
    });
  } catch (error) {
    console.error('Upload identity error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Upload profile photo (any role). For customers the photo is part of
//          verification, so it goes back to admin review.
// @route   POST /api/users/profile-photo  (also /api/users/customer/profile-photo)
// @access  Private
exports.uploadCustomerProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a photo' });
    }
    if (!/^image\//.test(req.file.mimetype || '') && !/\.(jpe?g|png|webp)$/i.test(req.file.originalname || '')) {
      return res.status(400).json({ message: 'Profile photo must be a JPG, PNG or WEBP image' });
    }

    const result = await uploadToCloudinary(req.file.path, 'rydzo/profiles');

    const user = await User.findById(req.user._id);
    user.profileImage = result.secure_url;

    const isCustomer = user.role === 'customer';
    if (isCustomer) {
      user.profilePhotoStatus = 'pending';
      user.customerApprovalStatus = 'pending';
    }

    await user.save();

    if (isCustomer) {
      await notifyAdmins(`New Profile Photo uploaded by ${req.user.name}`, req.user._id);
    }

    res.json({
      message: 'Profile photo uploaded successfully',
      url: result.secure_url,
      status: isCustomer ? 'pending' : 'approved'
    });
  } catch (error) {
    console.error('Upload profile photo error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Upload owner documents
// @route   POST /api/users/owner/documents
// @access  Private (Owner)
exports.uploadOwnerDocuments = async (req, res) => {
  try {
    if (req.user.role !== 'owner') {
      return res.status(403).json({ message: 'Access denied. Owner only.' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Please upload documents' });
    }

    const { aadhaarNumber, panNumber, documentTypes } = req.body;

    // Safely parse documentTypes
    let types = [];
    try {
      types = documentTypes ? JSON.parse(documentTypes) : [];
      if (!Array.isArray(types)) {
        types = [];
      }
    } catch (parseError) {
      console.error('Error parsing documentTypes:', parseError);
      types = [];
    }

    const uploadedDocs = [];
    const uploadErrors = [];

    // Upload files with error handling
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const docType = types[i] || 'other';

      try {
        // Check if file path exists
        if (!file.path) {
          throw new Error(`File path missing for file ${i + 1}`);
        }

        const result = await uploadToCloudinary(file.path, `rydzo/documents/${docType}`);
        uploadedDocs.push({
          type: docType,
          url: result.secure_url
        });
      } catch (uploadError) {
        console.error(`Error uploading document ${i + 1} (${file.originalname}):`, uploadError);
        uploadErrors.push({
          file: file.originalname,
          type: docType,
          error: uploadError.message
        });
      }
    }

    // If no documents were uploaded successfully, return error
    if (uploadedDocs.length === 0) {
      return res.status(500).json({
        message: 'Failed to upload documents',
        errors: uploadErrors
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update documents based on type
    uploadedDocs.forEach(doc => {
      if (doc.type === 'aadhaar') {
        if (aadhaarNumber) {
          user.aadhaarNumber = aadhaarNumber;
        }
        user.aadhaarDocumentUrl = doc.url;
        user.aadhaarStatus = 'pending';
      } else if (doc.type === 'pan') {
        if (panNumber) {
          user.panNumber = panNumber;
        }
        user.panDocumentUrl = doc.url;
        user.panStatus = 'pending';
      }
    });

    user.ownerApprovalStatus = 'pending';

    await user.save();

    await notifyAdmins(`New Owner Documents uploaded by ${req.user.name}`, req.user._id);

    // Return success with warnings if some files failed
    if (uploadErrors.length > 0) {
      return res.status(207).json({
        message: 'Some documents uploaded successfully, but some failed',
        documents: uploadedDocs,
        errors: uploadErrors
      });
    }

    res.json({
      message: 'Documents uploaded successfully. Waiting for admin approval.',
      documents: uploadedDocs
    });
  } catch (error) {
    console.error('Upload documents error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// @desc    Get customer verification status
// @route   GET /api/users/customer/status
// @access  Private (Customer)
exports.getCustomerStatus = async (req, res) => {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ message: 'Access denied. Customer only.' });
    }

    const user = await User.findById(req.user._id);

    const status = {
      isVerified: user.isVerified,
      drivingLicense: {
        uploaded: !!user.drivingLicense?.documentUrl,
        verified: user.drivingLicense?.verified || false,
        status: user.drivingLicense?.status || 'not_uploaded',
        url: user.drivingLicense?.documentUrl,
        rejectionReason: user.drivingLicense?.rejectionReason
      },
      selfie: {
        uploaded: !!user.selfieUrl,
        status: user.selfieStatus || 'not_uploaded',
        url: user.selfieUrl,
        rejectionReason: user.selfieRejectionReason
      },
      aadhaar: {
        uploaded: !!user.aadhaarDocumentUrl,
        status: user.aadhaarStatus || 'not_uploaded',
        url: user.aadhaarDocumentUrl,
        rejectionReason: user.aadhaarRejectionReason
      },
      pan: {
        uploaded: !!user.panDocumentUrl,
        status: user.panStatus || 'not_uploaded',
        url: user.panDocumentUrl,
        rejectionReason: user.panRejectionReason
      },
      profilePhoto: {
        uploaded: !!user.profileImage,
        status: user.profilePhotoStatus || 'not_uploaded',
        url: user.profileImage,
        rejectionReason: user.profilePhotoRejectionReason
      },
      phone: user.phone || null,
      drivingLicenseNumber: user.drivingLicense?.number || null,
      approvalStatus: user.customerApprovalStatus,
      approvalNote: user.customerApprovalNote,
      // Booking needs the documents; admin approval is checked later, before the ride.
      missingForBooking: user.customerApprovalStatus === 'approved' ? [] : missingBookingDocs(user),
      canBook: user.customerApprovalStatus === 'approved' ||
        (user.customerApprovalStatus !== 'rejected' && missingBookingDocs(user).length === 0)
    };

    res.json(status);
  } catch (error) {
    console.error('Get customer status error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get owner verification status
// @route   GET /api/users/owner/status
// @access  Private (Owner)
exports.getOwnerStatus = async (req, res) => {
  try {
    if (req.user.role !== 'owner') {
      return res.status(403).json({ message: 'Access denied. Owner only.' });
    }

    const user = await User.findById(req.user._id);

    const status = {
      isVerified: user.isVerified,
      aadhaarUploaded: !!user.aadhaarDocumentUrl,
      panUploaded: !!user.panDocumentUrl,
      approvalStatus: user.ownerApprovalStatus,
      approvalNote: user.ownerApprovalNote,
      canListBike: user.ownerApprovalStatus === 'approved'
    };

    res.json(status);
  } catch (error) {
    console.error('Get owner status error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


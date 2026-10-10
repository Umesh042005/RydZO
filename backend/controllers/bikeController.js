const Bike = require('../models/Bike');
const User = require('../models/User');
const { uploadToCloudinary } = require('../utils/cloudinary');

const OWNER_EDITABLE_FIELDS = [
  'description',
  'condition',
  'mileage',
  'pricing',
  'isAvailable',
  'availabilitySchedule',
  'handoverLocation'
];

// @desc    Create new bike listing
// @route   POST /api/bikes
// @access  Private (Owner)
exports.createBike = async (req, res) => {
  try {
    if (req.user.role !== 'owner') {
      return res.status(403).json({ message: 'Access denied. Owner only.' });
    }

    // Check if owner is approved
    if (req.user.ownerApprovalStatus !== 'approved') {
      return res.status(403).json({
        message: 'Your account is not approved yet. Please wait for admin approval.'
      });
    }

    const {
      bikeNumber,
      brand,
      model,
      manufacturingYear,
      mileage,
      condition,
      description,
      hourlyPrice,
      dailyPrice,
      handoverLocation,
      availabilitySchedule
    } = req.body;

    // Validation
    if (!bikeNumber || !brand || !model || !manufacturingYear || !mileage || !condition || !hourlyPrice || !dailyPrice) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Check if bike number already exists
    let bike = await Bike.findOne({ bikeNumber: bikeNumber.toUpperCase() });

    if (bike) {
      // Check if the existing bike belongs to the current user
      if (bike.owner.toString() !== req.user._id.toString()) {
        return res.status(400).json({ message: 'Bike with this number already exists' });
      }

      // If bike is already approved, prevent duplicate/overwrite
      if (bike.approvalStatus === 'approved') {
        return res.status(400).json({ message: 'This bike is already listed and approved.' });
      }

      // Update existing pending/rejected bike
      bike.brand = brand;
      bike.model = model;
      bike.manufacturingYear = parseInt(manufacturingYear);
      bike.mileage = parseFloat(mileage);
      bike.condition = condition;
      bike.description = description;
      bike.pricing = {
        hourly: parseFloat(hourlyPrice),
        daily: parseFloat(dailyPrice)
      };
      bike.handoverLocation = handoverLocation || {};
      bike.availabilitySchedule = availabilitySchedule || {};

      // Reset status to pending if it was rejected
      if (bike.approvalStatus === 'rejected') {
        bike.approvalStatus = 'pending';
      }
      // Ensure it is not available until approved
      bike.isAvailable = false;

      await bike.save();

      return res.status(200).json({
        message: 'Bike listing updated. Proceeding to image upload.',
        bike
      });
    }

    // Create new bike if it doesn't exist
    bike = new Bike({
      owner: req.user._id,
      bikeNumber: bikeNumber.toUpperCase(),
      brand,
      model,
      manufacturingYear: parseInt(manufacturingYear),
      mileage: parseFloat(mileage),
      condition,
      description,
      pricing: {
        hourly: parseFloat(hourlyPrice),
        daily: parseFloat(dailyPrice)
      },
      handoverLocation: handoverLocation || {},
      availabilitySchedule: availabilitySchedule || {},
      approvalStatus: 'pending',
      isAvailable: false
    });

    await bike.save();

    res.status(201).json({
      message: 'Bike listing created successfully. Waiting for admin approval.',
      bike
    });
  } catch (error) {
    console.error('Create bike error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all approved bikes
// @route   GET /api/bikes
// @access  Public
exports.getBikes = async (req, res) => {
  try {
    const { search, minPrice, maxPrice, condition, brand } = req.query;
    const query = {
      approvalStatus: 'approved',
      isAvailable: true,
      status: 'active'
    };

    if (search) {
      query.$or = [
        { bikeNumber: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } }
      ];
    }

    if (minPrice || maxPrice) {
      query['pricing.hourly'] = {};
      if (minPrice) query['pricing.hourly'].$gte = parseFloat(minPrice);
      if (maxPrice) query['pricing.hourly'].$lte = parseFloat(maxPrice);
    }

    if (condition) {
      query.condition = condition;
    }

    if (brand) {
      query.brand = { $regex: brand, $options: 'i' };
    }

    const bikes = await Bike.find(query)
      .populate('owner', 'name phone ownerApprovalStatus')
      .select('+images') // Ensure images are included
      .sort({ createdAt: -1 });

    // Log for debugging
    console.log(`Found ${bikes.length} approved bikes`);
    bikes.forEach(bike => {
      console.log(`Bike ${bike.bikeNumber}: images.frontView = ${bike.images?.frontView ? 'EXISTS' : 'MISSING'}`);
    });

    res.json(bikes);
  } catch (error) {
    console.error('Get bikes error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get bike by ID
// @route   GET /api/bikes/:id
// @access  Public
exports.getBikeById = async (req, res) => {
  try {
    const bike = await Bike.findById(req.params.id)
      .populate('owner', 'name phone email ownerApprovalStatus profileImage');

    if (!bike) {
      return res.status(404).json({ message: 'Bike not found' });
    }

    // Check insurance status
    const insuranceStatus = bike.documents.insurance?.documentUrl
      ? (bike.documents.insurance.expiryDate && new Date(bike.documents.insurance.expiryDate) > new Date()
        ? 'Insurance Available'
        : 'Insurance Expired')
      : 'No Insurance';

    res.json({
      ...bike.toObject(),
      insuranceStatus
    });
  } catch (error) {
    console.error('Get bike error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get owner's bikes
// @route   GET /api/bikes/owner
// @access  Private (Owner)
exports.getOwnerBikes = async (req, res) => {
  try {
    if (req.user.role !== 'owner') {
      return res.status(403).json({ message: 'Access denied. Owner only.' });
    }

    const bikes = await Bike.find({ owner: req.user._id }).sort({ createdAt: -1 });
    res.json(bikes);
  } catch (error) {
    console.error('Get owner bikes error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update bike
// @route   PUT /api/bikes/:id
// @access  Private (Owner)
exports.updateBike = async (req, res) => {
  try {
    const bike = await Bike.findById(req.params.id);

    if (!bike) {
      return res.status(404).json({ message: 'Bike not found' });
    }

    if (bike.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied. Not your bike.' });
    }

    // Only operational fields are owner-editable. Identity, photos, documents and
    // moderation fields (bikeNumber, images, documents, status, ...) were reviewed by
    // an admin at approval time and must not change behind that review.
    const updates = req.body || {};
    const unknown = Object.keys(updates).filter(key => !OWNER_EDITABLE_FIELDS.includes(key));
    if (unknown.length > 0) {
      return res.status(400).json({ message: `These fields cannot be updated: ${unknown.join(', ')}` });
    }

    if (updates.pricing !== undefined) {
      const { hourly, daily } = updates.pricing || {};
      const isValidPrice = (v) => v === undefined || (typeof v === 'number' && Number.isFinite(v) && v > 0);
      if (!isValidPrice(hourly) || !isValidPrice(daily)) {
        return res.status(400).json({ message: 'Prices must be positive numbers' });
      }
      if (hourly !== undefined) bike.pricing.hourly = hourly;
      if (daily !== undefined) bike.pricing.daily = daily;
    }

    if (updates.isAvailable !== undefined) {
      if (typeof updates.isAvailable !== 'boolean') {
        return res.status(400).json({ message: 'isAvailable must be true or false' });
      }
      bike.isAvailable = updates.isAvailable;
    }

    ['description', 'condition', 'mileage', 'availabilitySchedule', 'handoverLocation'].forEach(key => {
      if (updates[key] !== undefined) bike[key] = updates[key];
    });

    bike.updatedAt = new Date();
    await bike.save();

    res.json({ message: 'Bike updated successfully', bike });
  } catch (error) {
    console.error('Update bike error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete bike
// @route   DELETE /api/bikes/:id
// @access  Private (Owner)
exports.deleteBike = async (req, res) => {
  try {
    const bike = await Bike.findById(req.params.id);

    if (!bike) {
      return res.status(404).json({ message: 'Bike not found' });
    }

    if (bike.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied. Not your bike.' });
    }

    await bike.deleteOne();
    res.json({ message: 'Bike deleted successfully' });
  } catch (error) {
    console.error('Delete bike error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Upload bike images
// @route   POST /api/bikes/:id/images
// @access  Private (Owner)
exports.uploadBikeImages = async (req, res) => {
  try {
    const bike = await Bike.findById(req.params.id);

    if (!bike) {
      return res.status(404).json({ message: 'Bike not found' });
    }

    if (bike.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied. Not your bike.' });
    }

    console.log('----- DEBUG UPLOAD -----');
    console.log('Files count:', req.files?.length);
    console.log('Body:', req.body);
    console.log('Content-Type:', req.headers['content-type']);

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Please upload images' });
    }

    /* ---------------- SAFE imageTypes parsing ---------------- */
    let types = [];
    try {
      types = Array.isArray(JSON.parse(req.body.imageTypes))
        ? JSON.parse(req.body.imageTypes)
        : [];
    } catch (e) {
      types = [];
    }

    /* ---------------- Allowed & Required types ---------------- */
    const allowedTypes = [
      'frontView',
      'backView',
      'sideView',
      'meterPhoto',
      'scratches'
    ];

    const requiredTypes = [
      'frontView',
      'backView',
      'sideView',
      'meterPhoto'
    ];

    const receivedTypes = types.slice(0, req.files.length);
    const missing = requiredTypes.filter(t => !receivedTypes.includes(t));

    if (missing.length > 0) {
      return res.status(400).json({
        message: `Missing required images: ${missing.join(', ')}`
      });
    }

    /* ---------------- Upload images ---------------- */
    const uploadedImages = {};
    const uploadErrors = [];

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const imageType = allowedTypes.includes(types[i])
        ? types[i]
        : 'other';

      try {
        // Check if file path exists
        if (!file.path) {
          throw new Error(`File path missing for file ${i + 1}`);
        }

        const result = await uploadToCloudinary(
          file.path,
          `rydzo/bikes/${bike._id}/images`
        );

        if (imageType === 'frontView') uploadedImages.frontView = result.secure_url;
        else if (imageType === 'backView') uploadedImages.backView = result.secure_url;
        else if (imageType === 'sideView') uploadedImages.sideView = result.secure_url;
        else if (imageType === 'meterPhoto') uploadedImages.meterPhoto = result.secure_url;
        else if (imageType === 'scratches') uploadedImages.scratches = result.secure_url;
      } catch (uploadError) {
        console.error(`Error uploading file ${i + 1} (${file.originalname}):`, uploadError);
        uploadErrors.push({
          file: file.originalname,
          error: uploadError.message
        });
      }
    }

    // If no images were uploaded successfully, return error
    if (Object.keys(uploadedImages).length === 0) {
      return res.status(500).json({
        message: 'Failed to upload images',
        errors: uploadErrors
      });
    }

    // Update bike with successfully uploaded images
    bike.images = { ...bike.images, ...uploadedImages };
    await bike.save();

    // Return success with warnings if some files failed
    if (uploadErrors.length > 0) {
      return res.status(207).json({
        message: 'Some images uploaded successfully, but some failed',
        images: bike.images,
        errors: uploadErrors
      });
    }

    res.json({
      message: 'Images uploaded successfully',
      images: bike.images
    });

  } catch (error) {
    console.error('Upload images error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};


// @desc    Upload bike documents
// @route   POST /api/bikes/:id/documents
// @access  Private (Owner)
exports.uploadBikeDocuments = async (req, res) => {
  try {
    const bike = await Bike.findById(req.params.id);

    if (!bike) {
      return res.status(404).json({ message: 'Bike not found' });
    }

    if (bike.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied. Not your bike.' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Please upload documents' });
    }

    const { documentTypes, insuranceExpiry, pucExpiry } = req.body;
    let types = [];
    try {
      types = JSON.parse(documentTypes || '[]');
    } catch (e) {
      types = [];
    }

    const uploadErrors = [];
    let uploadSuccess = false;

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const docType = types[i] || 'other';

      try {
        // Check if file path exists
        if (!file.path) {
          throw new Error(`File path missing for file ${i + 1}`);
        }

        const result = await uploadToCloudinary(file.path, `rydzo/bikes/${bike._id}/documents`);

        if (docType === 'rc') {
          bike.documents.rc = {
            documentUrl: result.secure_url,
            verified: false
          };
          uploadSuccess = true;
        } else if (docType === 'insurance') {
          bike.documents.insurance = {
            documentUrl: result.secure_url,
            verified: false,
            expiryDate: insuranceExpiry ? new Date(insuranceExpiry) : undefined
          };
          uploadSuccess = true;
        } else if (docType === 'puc') {
          bike.documents.puc = {
            documentUrl: result.secure_url,
            verified: false,
            expiryDate: pucExpiry ? new Date(pucExpiry) : undefined
          };
          uploadSuccess = true;
        }
      } catch (uploadError) {
        console.error(`Error uploading document ${i + 1} (${file.originalname}):`, uploadError);
        uploadErrors.push({
          file: file.originalname,
          error: uploadError.message
        });
      }
    }

    // If no documents were uploaded successfully, return error
    if (!uploadSuccess) {
      return res.status(500).json({
        message: 'Failed to upload documents',
        errors: uploadErrors
      });
    }

    await bike.save();

    // Return success with warnings if some files failed
    if (uploadErrors.length > 0) {
      return res.status(207).json({
        message: 'Some documents uploaded successfully, but some failed',
        documents: bike.documents,
        errors: uploadErrors
      });
    }

    res.json({ message: 'Documents uploaded successfully', documents: bike.documents });
  } catch (error) {
    console.error('Upload documents error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


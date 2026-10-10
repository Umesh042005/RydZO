const Agreement = require('../models/Agreement');
const Booking = require('../models/Booking');
const Bike = require('../models/Bike');
const User = require('../models/User');
const agreementTemplate = require('../utils/agreementTemplate');
const { generateOTP, sendOTPviaSMS, sendOTPviaEmail } = require('../utils/otp');

// Only what the agreement template needs; never load full user documents here.
const PARTY_FIELDS = 'name phone';
const BIKE_FIELDS = 'brand model bikeNumber documents.insurance';

const AGREEMENT_OTP_TTL_MS = 10 * 60 * 1000;
const AGREEMENT_OTP_MAX_ATTEMPTS = 5;

// @desc    Create digital agreement
// @route   POST /api/agreements
// @access  Private
exports.createAgreement = async (req, res) => {
  try {
    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId)
      .populate('customer', PARTY_FIELDS)
      .populate('owner', PARTY_FIELDS)
      .populate('bike', BIKE_FIELDS);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check access
    if (req.user.role !== 'admin' &&
        booking.customer._id.toString() !== req.user._id.toString() &&
        booking.owner._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if agreement already exists
    let agreement = await Agreement.findOne({ booking: bookingId });
    if (agreement && agreement.accepted) {
      return res.json({ message: 'Agreement already exists', agreement });
    }
    if (agreement) {
      const refreshedText = agreementTemplate(
        {
          customerName: booking.customer.name,
          customerPhone: booking.customer.phone,
          startTime: booking.startTime,
          endTime: booking.endTime,
          startTimeStr: booking.startTimeStr,
          endTimeStr: booking.endTimeStr,
          startDate: booking.startDate,
          endDate: booking.endDate,
          createdAt: agreement.createdAt || booking.createdAt,
          duration: `${booking.duration?.hours || 1} hours`,
          securityDeposit: booking.securityDeposit,
          lateReturnPenalty: 500,
          bookingId: booking._id,
          advancePaymentRequired: booking.advancePayment?.requiredAmount || 0
        },
        {
          brand: booking.bike.brand,
          model: booking.bike.model,
          bikeNumber: booking.bike.bikeNumber,
          insuranceStatus: booking.bike.documents?.insurance?.documentUrl ? 'Insurance Available' : 'No Insurance'
        },
        {
          name: booking.owner.name,
          phone: booking.owner.phone
        }
      );
      if (refreshedText && refreshedText !== agreement.agreementText) {
        agreement.agreementText = refreshedText;
        await agreement.save();
      }
      return res.json({ message: 'Agreement already exists', agreement });
    }

    // Generate agreement text
    const agreementText = agreementTemplate(
      {
        customerName: booking.customer.name,
        customerPhone: booking.customer.phone,
        startTime: booking.startTime,
        endTime: booking.endTime,
        startTimeStr: booking.startTimeStr,
        endTimeStr: booking.endTimeStr,
        startDate: booking.startDate,
        endDate: booking.endDate,
        createdAt: booking.createdAt,
        duration: `${booking.duration?.hours || 1} hours`,
        securityDeposit: booking.securityDeposit,
        lateReturnPenalty: 500,
        bookingId: booking._id,
        advancePaymentRequired: booking.advancePayment?.requiredAmount || 0
      },
      {
        brand: booking.bike.brand,
        model: booking.bike.model,
        bikeNumber: booking.bike.bikeNumber,
        insuranceStatus: booking.bike.documents.insurance?.documentUrl 
          ? (booking.bike.documents.insurance.expiryDate && 
             new Date(booking.bike.documents.insurance.expiryDate) > new Date() 
             ? 'Insurance Available' 
             : 'Insurance Expired')
          : 'No Insurance'
      },
      {
        name: booking.owner.name,
        phone: booking.owner.phone
      }
    );

    agreement = new Agreement({
      booking: bookingId,
      customer: booking.customer._id,
      owner: booking.owner._id,
      bike: booking.bike._id,
      agreementText
    });

    await agreement.save();

    res.status(201).json({
      message: 'Agreement created successfully',
      agreement
    });
  } catch (error) {
    console.error('Create agreement error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get agreement by booking ID
// @route   GET /api/agreements/booking/:bookingId
// @access  Private
exports.getAgreement = async (req, res) => {
  try {
    const agreement = await Agreement.findOne({ booking: req.params.bookingId })
      .populate('booking')
      .populate('customer', PARTY_FIELDS)
      .populate('owner', PARTY_FIELDS)
      .populate('bike', BIKE_FIELDS);

    if (!agreement) {
      return res.status(404).json({ message: 'Agreement not found' });
    }

    // Check access
    const userId = req.user._id.toString();
    if (req.user.role !== 'admin' &&
        agreement.customer?._id.toString() !== userId &&
        agreement.owner?._id.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Until accepted, keep agreementText in sync with the booking (single source of truth).
    // Once accepted it is frozen as the record of what was signed.
    if (!agreement.accepted && agreement.booking && agreement.customer && agreement.bike && agreement.owner) {
      const refreshedText = agreementTemplate(
        {
          customerName: agreement.customer.name,
          customerPhone: agreement.customer.phone,
          startTime: agreement.booking.startTime,
          endTime: agreement.booking.endTime,
          startTimeStr: agreement.booking.startTimeStr,
          endTimeStr: agreement.booking.endTimeStr,
          startDate: agreement.booking.startDate,
          endDate: agreement.booking.endDate,
          createdAt: agreement.createdAt || agreement.booking.createdAt,
          duration: `${agreement.booking.duration?.hours || 1} hours`,
          securityDeposit: agreement.booking.securityDeposit,
          lateReturnPenalty: 500,
          bookingId: agreement.booking._id,
          advancePaymentRequired: agreement.booking.advancePayment?.requiredAmount || 0
        },
        {
          brand: agreement.bike.brand,
          model: agreement.bike.model,
          bikeNumber: agreement.bike.bikeNumber,
          insuranceStatus: agreement.bike.documents?.insurance?.documentUrl ? 'Insurance Available' : 'No Insurance'
        },
        {
          name: agreement.owner.name,
          phone: agreement.owner.phone
        }
      );
      if (refreshedText && refreshedText !== agreement.agreementText) {
        agreement.agreementText = refreshedText;
        await agreement.save();
      }
    }

    res.json(agreement);
  } catch (error) {
    console.error('Get agreement error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Accept agreement
// @route   POST /api/agreements/:id/accept
// @access  Private
exports.acceptAgreement = async (req, res) => {
  try {
    const { acceptanceMethod, consentFlags, useOTP } = req.body;
    const agreement = await Agreement.findById(req.params.id);

    if (!agreement) {
      return res.status(404).json({ message: 'Agreement not found' });
    }

    // Check access
    if (agreement.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only customer can accept the agreement' });
    }

    if (agreement.accepted) {
      return res.status(400).json({ message: 'Agreement already accepted' });
    }

    // If OTP method is chosen
    if (useOTP) {
      const otp = generateOTP();
      agreement.otp = otp;
      agreement.otpExpiry = new Date(Date.now() + AGREEMENT_OTP_TTL_MS);
      agreement.otpAttempts = 0;
      agreement.acceptanceMethod = 'otp';

      // Send OTP
      const customer = await User.findById(agreement.customer);
      if (customer.email) {
        await sendOTPviaEmail(customer.email, otp);
      }
      if (customer.phone) {
        await sendOTPviaSMS(customer.phone, otp);
      }

      await agreement.save();
      return res.json({ 
        message: 'OTP sent. Please verify to accept agreement.',
        requiresOTP: true
      });
    }

    // Checkbox acceptance
    const mandatoryOk = !!(consentFlags &&
      consentFlags.locationTracking &&
      consentFlags.geoFencing &&
      consentFlags.damageResponsibility &&
      consentFlags.theftFIR &&
      consentFlags.securityDeposit &&
      consentFlags.ownerHandover &&
      consentFlags.aggregatorDisclaimer);

    if (!mandatoryOk) {
      return res.status(400).json({ 
        message: 'All mandatory consents must be accepted' 
      });
    }

    agreement.accepted = true;
    agreement.acceptanceMethod = 'checkbox';
    agreement.consentFlags = consentFlags;
    agreement.acceptedAt = new Date();
    agreement.userIP = req.ip;
    agreement.userAgent = req.get('user-agent');

    await agreement.save();

    // Update booking
    const booking = await Booking.findById(agreement.booking);
    booking.agreementAccepted = true;
    booking.agreementTimestamp = new Date();
    booking.agreementIP = req.ip;
    await booking.save();

    res.json({ 
      message: 'Agreement accepted successfully',
      agreement,
      booking
    });
  } catch (error) {
    console.error('Accept agreement error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Verify OTP for agreement
// @route   POST /api/agreements/:id/verify-otp
// @access  Private
exports.verifyAgreementOTP = async (req, res) => {
  try {
    const { otp, consentFlags } = req.body;
    const agreement = await Agreement.findById(req.params.id);

    if (!agreement) {
      return res.status(404).json({ message: 'Agreement not found' });
    }

    // Only the customer can consent, and only with an OTP that was actually issued
    if (agreement.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only customer can accept the agreement' });
    }

    if (agreement.accepted) {
      return res.status(400).json({ message: 'Agreement already accepted' });
    }

    if (!agreement.otp || !agreement.otpExpiry || new Date() > agreement.otpExpiry) {
      return res.status(400).json({ message: 'OTP expired or not requested. Please request a new one.' });
    }

    if (agreement.otpAttempts >= AGREEMENT_OTP_MAX_ATTEMPTS) {
      return res.status(429).json({ message: 'Too many invalid attempts. Please request a new OTP.' });
    }

    if (typeof otp !== 'string' || agreement.otp !== otp) {
      agreement.otpAttempts += 1;
      await agreement.save();
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    const mandatoryOk = !!(consentFlags &&
      consentFlags.locationTracking &&
      consentFlags.geoFencing &&
      consentFlags.damageResponsibility &&
      consentFlags.theftFIR &&
      consentFlags.securityDeposit &&
      consentFlags.ownerHandover &&
      consentFlags.aggregatorDisclaimer);

    if (!mandatoryOk) {
      return res.status(400).json({ 
        message: 'All mandatory consents must be accepted' 
      });
    }

    agreement.accepted = true;
    agreement.otpVerified = true;
    agreement.consentFlags = consentFlags;
    agreement.acceptedAt = new Date();
    agreement.userIP = req.ip;
    agreement.userAgent = req.get('user-agent');
    agreement.otp = undefined;
    agreement.otpExpiry = undefined;

    await agreement.save();

    // Update booking
    const booking = await Booking.findById(agreement.booking);
    booking.agreementAccepted = true;
    booking.agreementTimestamp = new Date();
    booking.agreementIP = req.ip;
    await booking.save();

    res.json({ 
      message: 'Agreement accepted successfully via OTP',
      agreement,
      booking
    });
  } catch (error) {
    console.error('Verify agreement OTP error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


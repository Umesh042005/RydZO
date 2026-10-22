const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { generateOTP, sendOTPviaSMS, sendOTPviaEmail } = require('../utils/otp');
const { isNonEmptyString, buildIdentityFilter } = require('../utils/validation');

// Roles a user may pick at self-registration. Admins are created only via create-admin.js.
const SELF_REGISTER_ROLES = ['customer', 'owner'];

const googleClient = new OAuth2Client();

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'rydzo_secret_key', {
    expiresIn: '30d'
  });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;

    // Validation
    if (![name, phone, password, email].every(isNonEmptyString)) {
      return res.status(400).json({ message: 'Please provide name, phone, email, and password.' });
    }

    if (role !== undefined && !SELF_REGISTER_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Check if user exists
    const existingUser = await User.findOne(buildIdentityFilter(phone, email));

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this phone or email' });
    }

    // Create user (Auto-verified for simple flow)
    const user = new User({
      name,
      email,
      phone: phone.trim(),
      password,
      role: role || 'customer',
      isVerified: true, // Auto-verify
      customerApprovalStatus: 'pending',
      ownerApprovalStatus: 'pending'
    });

    await user.save();

    // Generate token immediately
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'User registered successfully',
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
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { phone, email, password } = req.body;

    const identityFilter = buildIdentityFilter(phone, email);
    if (!identityFilter || !isNonEmptyString(password)) {
      return res.status(400).json({ message: 'Please provide phone/email and password' });
    }

    // Find user
    const user = await User.findOne(identityFilter);

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.password) {
      return res.status(401).json({ message: 'This account uses Google sign-in. Please continue with Google.' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if verified (Auto-verified now, but keeping check just in case of old data)
    if (user.isVerified === false) {
      // Auto-verify legacy users on login for convenience
      user.isVerified = true;
      await user.save();
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
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
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Send OTP
// @route   POST /api/auth/send-otp
// @access  Public
exports.sendOTP = async (req, res) => {
  try {
    const { phone, email } = req.body;

    const identityFilter = buildIdentityFilter(phone, email);
    if (!identityFilter) {
      return res.status(400).json({ message: 'Please provide phone or email' });
    }

    const user = await User.findOne(identityFilter);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    // Send OTP via Email (default method - free)
    if (!user.email) {
      return res.status(400).json({ message: 'User email not found. Email is required for OTP verification.' });
    }

    const emailSent = await sendOTPviaEmail(user.email, otp);

    // Optional: Also send via SMS if configured (for future use)
    if (phone && user.phone && process.env.ENABLE_SMS_OTP === 'true') {
      await sendOTPviaSMS(user.phone, otp);
    }

    if (emailSent) {
      res.json({ message: 'OTP sent successfully to your email' });
    } else {
      res.status(500).json({ message: 'Failed to send OTP email. Please check email configuration.' });
    }
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOTP = async (req, res) => {
  try {
    const { phone, email, otp } = req.body;

    const identityFilter = buildIdentityFilter(phone, email);
    if (!isNonEmptyString(otp) || !identityFilter) {
      return res.status(400).json({ message: 'Please provide OTP and phone/email' });
    }

    const user = await User.findOne(identityFilter);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check OTP
    if (!user.otp || user.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Check expiry
    if (!user.otpExpiry || new Date() > user.otpExpiry) {
      return res.status(400).json({ message: 'OTP expired. Please request a new one.' });
    }

    // Verify user
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      message: 'OTP verified successfully',
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
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
exports.resendOTP = async (req, res) => {
  try {
    const { phone, email } = req.body;

    const identityFilter = buildIdentityFilter(phone, email);
    if (!identityFilter) {
      return res.status(400).json({ message: 'Please provide phone or email' });
    }

    const user = await User.findOne(identityFilter);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    // Send OTP
    let sent = false;
    if (email && user.email) {
      sent = await sendOTPviaEmail(email, otp);
    }
    if (phone && user.phone) {
      sent = await sendOTPviaSMS(phone, otp) || sent;
    }

    if (sent) {
      res.json({ message: 'OTP resent successfully' });
    } else {
      res.status(500).json({ message: 'Failed to resend OTP' });
    }
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Check user role prior to authentication routing
// @route   POST /api/auth/check-role
// @access  Public
exports.checkRole = async (req, res) => {
  try {
    const { phone, email } = req.body;
    const identityFilter = buildIdentityFilter(phone, email);
    if (!identityFilter) {
      return res.status(400).json({ message: 'Please provide phone or email' });
    }

    const user = await User.findOne(identityFilter).select('role');

    if (!user) {
      return res.status(404).json({ message: 'User not found', role: null });
    }

    res.json({ role: user.role });
  } catch (error) {
    console.error('Check role error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// @desc    Sign in or sign up with Google
// @route   POST /api/auth/google
// @access  Public
// Body: { credential: <Google ID token>, role?: 'customer' | 'owner' (only used for new accounts) }
exports.googleAuth = async (req, res) => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.status(503).json({ message: 'Google sign-in is not configured on this server' });
    }

    const { credential, role } = req.body || {};
    if (!isNonEmptyString(credential)) {
      return res.status(400).json({ message: 'Missing Google credential' });
    }
    if (role !== undefined && !SELF_REGISTER_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: clientId });
      payload = ticket.getPayload();
    } catch (err) {
      return res.status(401).json({ message: 'Google sign-in failed. Please try again.' });
    }

    if (!payload?.sub || !payload.email || !payload.email_verified) {
      return res.status(401).json({ message: 'Your Google email is not verified' });
    }

    const email = payload.email.toLowerCase();
    let user = await User.findOne({ googleId: payload.sub });
    let isNewUser = false;

    if (!user) {
      // Same email registered with a password: link it (Google has verified the email).
      user = await User.findOne({ email });
      if (user) {
        if (user.role === 'admin') {
          return res.status(403).json({ message: 'Admins must sign in with the admin login' });
        }
        user.googleId = payload.sub;
        if (!user.profileImage && payload.picture) user.profileImage = payload.picture;
        user.isVerified = true;
        await user.save();
      } else {
        user = await User.create({
          name: payload.name || email.split('@')[0],
          email,
          googleId: payload.sub,
          profileImage: payload.picture,
          role: role || 'customer',
          isVerified: true
        });
        isNewUser = true;
      }
    }

    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Admins must sign in with the admin login' });
    }
    if (!user.isActive) {
      return res.status(403).json({ message: 'This account has been blocked' });
    }

    const token = generateToken(user._id);
    res.status(isNewUser ? 201 : 200).json({
      token,
      isNewUser,
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
    console.error('Google auth error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

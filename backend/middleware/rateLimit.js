const { rateLimit } = require('express-rate-limit');

const tooMany = (message) => ({ message });

// General limit for public auth endpoints (login, register, check-role, OTP send).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: tooMany('Too many requests. Please try again later.')
});

// Tight limit for guessing-sensitive endpoints (OTP verification, admin login).
// 6-digit OTPs must not be brute-forceable within their 5-minute lifetime.
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: tooMany('Too many attempts. Please try again later.')
});

module.exports = { authLimiter, strictLimiter };

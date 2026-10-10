const { rateLimit } = require('express-rate-limit');

const tooMany = (message) => ({ message });

// General limit for public auth endpoints (login, register, check-role, OTP send).
// Successful requests are not counted, so normal users signing in are never locked out;
// only failures (wrong password, unknown account, bad input) use up the budget.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: tooMany('Too many requests. Please try again later.')
});

// Tight limits for guessing-sensitive endpoints. Separate instances so attempts on
// one endpoint do not use up the budget of the other.
// 6-digit OTPs must not be brute-forceable within their 5-minute lifetime.
const strictOptions = {
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: tooMany('Too many attempts. Please try again later.')
};
const otpVerifyLimiter = rateLimit(strictOptions);
const adminLoginLimiter = rateLimit(strictOptions);

module.exports = { authLimiter, otpVerifyLimiter, adminLoginLimiter };

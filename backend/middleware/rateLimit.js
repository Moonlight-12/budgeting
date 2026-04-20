const rateLimit = require("express-rate-limit");

// Use X-Forwarded-For from Vercel's proxy as the client IP
const keyGenerator = (req) => req.headers["x-forwarded-for"]?.split(",")[0].trim() ?? req.ip;

// Strict limiter for auth endpoints (signin, signup, change-password)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  message: { message: "Too many attempts, please try again later." },
});

// General API limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  message: { message: "Too many requests, please try again later." },
});

module.exports = { authLimiter, apiLimiter };

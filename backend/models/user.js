const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  refreshToken: { type: String },
  upApiKey: { type: String },
  googleId: { type: String, sparse: true },
  email: { type: String, sparse: true },
  otp: { type: String },
  otpExpiry: { type: Date },
  preferredCurrency: { type: String, default: "AUD", enum: ["AUD", "IDR"] },
  emailVerified: { type: Boolean, default: true },
  billingStartDay: { type: Number, default: 1, min: 1, max: 28 },
  otpAttempts: { type: Number, default: 0 },
  otpLockedUntil: { type: Date },
  otpLastSentAt: { type: Date },
});

// Auto-delete unverified signup documents once otpExpiry passes
userSchema.index(
  { otpExpiry: 1 },
  { expireAfterSeconds: 0, partialFilterExpression: { emailVerified: false } }
);

const User = mongoose.model("User", userSchema);

module.exports = User;

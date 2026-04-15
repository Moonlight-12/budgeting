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
});

const User = mongoose.model("User", userSchema);

module.exports = User;

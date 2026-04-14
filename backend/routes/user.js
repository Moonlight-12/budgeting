const express = require("express");
const router = express.Router();
const User = require("../models/user");
const authMiddleware = require("../middleware/auth");

// TODO: Implement user routes
// router.get('/profile', ...);
// router.put('/profile', ...);

//get user information
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId).select("-password -refreshToken -otp -otpExpiry");

    if (!user) {
      return res.status(404).json({ message: "User Not Found" });
    }
    res.json({ user });
  } catch (error) {
    console.error("Error Fetching User Information", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/change-username", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    if (!req.body.newUsername || typeof req.body.newUsername !== "string") {
      return res.status(400).json({ message: "New Username Required" });
    }
    const trimmed = req.body.newUsername.trim();
    if (trimmed.length < 3 || trimmed.length > 30) {
      return res.status(400).json({ message: "Username must be 3-30 characters" });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      return res.status(400).json({ message: "Username can only contain letters, numbers, and underscores" });
    }
    const user = await User.findOne({ _id: userId });

    if (!user) {
      return res.status(404).json({ message: "User Not Found" });
    }

    const exists = await User.findOne({ username: req.body.newUsername });
    if (exists) {
      return res.status(409).json({ message: "Username is Taken" });
    }

    user.username = req.body.newUsername;
    await user.save();

    return res.status(200).json({ message: "Username Change Successfull" });
  } catch (error) {
    console.error("Fail to Change Username", error);
    return res.status(500).json({ message: " Internal Server Error" });
  }
});

// GET: check if Up Bank token is set (returns masked version, never the raw key)
router.get("/up-token", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("upApiKey");
    const key = user?.upApiKey;
    res.json({
      hasToken: !!key,
      maskedToken: key ? `up:yeah:${"*".repeat(Math.max(0, key.length - 8))}${key.slice(-4)}` : null,
    });
  } catch (error) {
    console.error("Error fetching Up token:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// PUT: save/replace Up Bank token
router.put("/up-token", authMiddleware, async (req, res) => {
  try {
    const { upApiKey } = req.body;
    if (!upApiKey || typeof upApiKey !== "string") {
      return res.status(400).json({ message: "upApiKey is required" });
    }
    await User.findByIdAndUpdate(req.user.userId, { upApiKey });
    res.json({
      message: "Up Bank token saved",
      maskedToken: `up:yeah:${"*".repeat(Math.max(0, upApiKey.length - 8))}${upApiKey.slice(-4)}`,
    });
  } catch (error) {
    console.error("Error saving Up token:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// POST: send OTP to email for linking
router.post("/link-email/send-otp", authMiddleware, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string") {
      return res.status(400).json({ message: "Email is required" });
    }

    const existing = await User.findOne({ email, _id: { $ne: req.user.userId } });
    if (existing) {
      return res.status(409).json({ message: "Email already linked to another account" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await User.findByIdAndUpdate(req.user.userId, { otp, otpExpiry });

    const nodemailer = require("nodemailer");
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: "Your verification code",
      text: `Your verification code is: ${otp}\n\nThis code expires in 10 minutes.`,
      html: `<p>Your verification code is: <strong>${otp}</strong></p><p>This code expires in 10 minutes.</p>`,
    });

    res.json({ message: "OTP sent" });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ message: "Failed to send OTP", error: error.message });
  }
});

// POST: verify OTP and link email
router.post("/link-email/verify-otp", authMiddleware, async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }
    if (!user.otpExpiry || user.otpExpiry < new Date()) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    user.email = email;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    res.json({ message: "Email linked successfully", email });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// POST: link Google account to current user
router.post("/link-google", authMiddleware, async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ message: "Credential required" });

    const tokenInfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    const payload = await tokenInfoRes.json();

    if (!tokenInfoRes.ok || payload.error) {
      return res.status(401).json({ message: "Invalid Google credential" });
    }
    if (payload.aud !== process.env.GOOGLE_CLIENT_ID) {
      return res.status(401).json({ message: "Token audience mismatch" });
    }

    const { sub: googleId, email } = payload;

    const existing = await User.findOne({ googleId, _id: { $ne: req.user.userId } });
    if (existing) {
      return res.status(409).json({ message: "Google account already linked to another user" });
    }

    await User.findByIdAndUpdate(req.user.userId, { googleId, ...(email ? { email } : {}) });
    res.json({ message: "Google account linked", email });
  } catch (error) {
    console.error("Error linking Google:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;

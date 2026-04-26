const express = require("express");
const User = require("../models/user");
const router = express.Router();
const bcrypt = require("bcrypt");
const saltRounds = 10;
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { randomInt } = require("crypto");
const authMiddleware = require("../middleware/auth");
const { seedCategories } = require("../utils/seedCategories");
const { sendMail } = require("../utils/mailer");

// Step 1 — validate, create unverified user, send OTP
router.post("/signup/send-otp", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || typeof username !== "string" || username.trim().length < 3 || username.trim().length > 30) {
      return res.status(400).json({ error: "Username must be 3-30 characters" });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      return res.status(400).json({ error: "Username can only contain letters, numbers, and underscores" });
    }
    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: "Valid email is required" });
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const trimmedUsername = username.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (await User.findOne({ username: trimmedUsername, emailVerified: true })) {
      return res.status(409).json({ error: "Username already exists" });
    }
    if (await User.findOne({ email: normalizedEmail, emailVerified: true })) {
      return res.status(409).json({ error: "Email already registered" });
    }

    // Enforce 60s resend cooldown
    const existing = await User.findOne({ email: normalizedEmail, emailVerified: false });
    if (existing?.otpLastSentAt) {
      const secondsSinceSent = (Date.now() - existing.otpLastSentAt.getTime()) / 1000;
      if (secondsSinceSent < 60) {
        const retryAfterSeconds = Math.ceil(60 - secondsSinceSent);
        return res.status(429).json({ error: "Please wait before requesting a new code", retryAfterSeconds });
      }
    }

    // Clean up any previous unverified attempts for this username or email
    await User.deleteMany({ emailVerified: false, $or: [{ email: normalizedEmail }, { username: trimmedUsername }] });

    const otp = randomInt(100000, 1000000).toString();
    const now = new Date();
    const newUser = new User({
      username: trimmedUsername,
      email: normalizedEmail,
      password: await bcrypt.hash(password, saltRounds),
      emailVerified: false,
      otp,
      otpExpiry: new Date(now.getTime() + 10 * 60 * 1000),
      otpLastSentAt: now,
      otpAttempts: 0,
      createdAt: now,
    });
    await newUser.save();

    await sendMail(
      normalizedEmail,
      "Verify your email",
      `Your verification code is: ${otp}\n\nThis code expires in 10 minutes.`,
      `<p>Your verification code is: <strong>${otp}</strong></p><p>This code expires in 10 minutes.</p>`
    );

    const resendAvailableAt = new Date(now.getTime() + 60 * 1000).toISOString();
    res.json({ message: "Verification code sent", resendAvailableAt });
  } catch (error) {
    console.error("Error during signup send-otp:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Step 2 — verify OTP, activate account, issue session
router.post("/signup", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: "Email and code are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const inputOtp = otp.toString().trim();

    const user = await User.findOne({ email: normalizedEmail, emailVerified: false });

    // Generic error — don't reveal whether account exists or OTP is expired
    if (!user || !user.otp || !user.otpExpiry || user.otpExpiry < new Date()) {
      return res.status(400).json({ error: "Invalid or expired code. Please request a new one." });
    }

    // Check account lock
    if (user.otpLockedUntil && user.otpLockedUntil > new Date()) {
      return res.status(429).json({
        error: "Too many failed attempts. Account is temporarily locked.",
        lockedUntil: user.otpLockedUntil.toISOString(),
      });
    }

    // Atomically increment attempt counter
    const updated = await User.findOneAndUpdate(
      { _id: user._id, emailVerified: false },
      { $inc: { otpAttempts: 1 } },
      { new: true }
    );
    if (!updated) return res.status(400).json({ error: "Invalid or expired code. Please request a new one." });

    // Timing-safe OTP comparison
    const storedOtp = (updated.otp || "").slice(0, 6).padEnd(6, "\0");
    const isValid =
      inputOtp.length === updated.otp.length &&
      crypto.timingSafeEqual(Buffer.from(storedOtp), Buffer.from(inputOtp.slice(0, 6).padEnd(6, "\0")));

    if (!isValid) {
      if (updated.otpAttempts >= 5) {
        const lockedUntil = new Date(Date.now() + 5 * 60 * 1000);
        await User.updateOne(
          { _id: user._id },
          { $set: { otpLockedUntil: lockedUntil }, $unset: { otp: 1, otpExpiry: 1 } }
        );
        return res.status(429).json({
          error: "Too many failed attempts. Account locked for 5 minutes.",
          lockedUntil: lockedUntil.toISOString(),
        });
      }
      return res.status(400).json({
        error: "Invalid code",
        attemptsLeft: 5 - updated.otpAttempts,
      });
    }

    // OTP correct — activate account
    updated.emailVerified = true;
    updated.otp = undefined;
    updated.otpExpiry = undefined;
    updated.otpAttempts = 0;
    updated.otpLockedUntil = undefined;
    await updated.save();

    await seedCategories(updated._id);

    const cookieOpts = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" };
    const accessToken = jwt.sign({ userId: updated._id, username: updated.username }, process.env.JWT_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign({ userId: updated._id, username: updated.username }, process.env.REFRESH_SECRET, { expiresIn: "7d" });
    updated.refreshToken = refreshToken;
    await updated.save();

    res.cookie("accessToken", accessToken, { ...cookieOpts, maxAge: 15 * 60 * 1000 });
    res.cookie("refreshToken", refreshToken, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000 });

    res.status(201).json({ message: "Signup successful", username: updated.username });
  } catch (error) {
    console.error("Error during signup:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/signin", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const comparePassword = await bcrypt.compare(password, user.password);
    if (!comparePassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    if (!user.emailVerified) {
      return res.status(403).json({ error: "Please verify your email before signing in" });
    }
    const accessToken = jwt.sign(
      {
        userId: user._id,
        username: user.username,
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" },
    );

    const refreshToken = jwt.sign(
      {
        userId: user._id,
        username: user.username,
      },
      process.env.REFRESH_SECRET,
      { expiresIn: "7d" },
    );

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: "Signin Successful",
      username: user.username,
    });
  } catch (error) {
    console.error("Error during signin:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/change-password", authMiddleware, async (req, res) => {
  try {
    const { password, newPassword } = req.body;
    if (!password || !newPassword) {
      return res.status(400).json({ error: "Current password and new password are required" });
    }
    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters" });
    }
    const userId = req.user.userId;

    const user = await User.findOne({ _id: userId });

    if (!user) {
      return res.status(404).json({ message: "User Not Found" });
    }

    const comparePassword = await bcrypt.compare(password, user.password);
    if (!comparePassword) {
      return res.status(401).json({ error: "Invalid Credentials" });
    }

    const newHashedPassword = await bcrypt.hash(newPassword, saltRounds);

    user.password = newHashedPassword;
    await user.save();
    return res.status(200).json({ message: "Change Password Successfull" });
  } catch (error) {
    console.error("Error changing password: ", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Email is required" });
    }
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    // Don't reveal whether the email exists
    if (!user) return res.json({ message: "If that email is registered, you will receive a code" });

    const otp = randomInt(100000, 1000000).toString();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendMail(
      email,
      "Password reset code",
      `Your password reset code is: ${otp}\n\nThis code expires in 10 minutes.`,
      `<p>Your password reset code is: <strong>${otp}</strong></p><p>This code expires in 10 minutes.</p>`
    );

    res.json({ message: "If that email is registered, you will receive a code" });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: "Email, code, and new password are required" });
    }
    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user || user.otp !== otp) {
      return res.status(400).json({ error: "Invalid code" });
    }
    if (!user.otpExpiry || user.otpExpiry < new Date()) {
      return res.status(400).json({ error: "Code has expired" });
    }
    user.password = await bcrypt.hash(newPassword, saltRounds);
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();
    res.json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/refresh", async (req, res) => {
  const token = req.cookies.refreshToken;

  if (!token) {
    return res.status(401).json({ message: "Refresh Token Missing" });
  }

  jwt.verify(token, process.env.REFRESH_SECRET, async (error, decoded) => {
    if (error) {
      return res
        .status(403)
        .json({ message: "Invalid or Expired Refresh Token" });
    }

    const user = await User.findById(decoded.userId);
    if (!user || user.refreshToken !== token) {
      return res.status(403).json({ message: "Token Revoked" });
    }

    const newAccessToken = jwt.sign(
      {
        userId: decoded.userId,
        username: decoded.username,
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" },
    );

    const newRefreshToken = jwt.sign(
      {
        userId: decoded.userId,
        username: decoded.username,
      },
      process.env.REFRESH_SECRET,
      { expiresIn: "7d" },
    );

    user.refreshToken = newRefreshToken;
    await user.save();

    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({ message: "Token Refreshed" });
  });
});

router.post("/signout", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User Not Found" });
    }

    user.refreshToken = null;
    await user.save();

    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    return res.status(200).json({ message: "signout successfull" });
    
  } catch (error) {
    console.error("Fail to Signout", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

// Google OAuth — verifies ID token with Google, creates/finds user, issues JWT
router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: "Credential required" });

    // Verify the ID token with Google's tokeninfo endpoint (no extra packages needed)
    const tokenInfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    const payload = await tokenInfoRes.json();

    if (!tokenInfoRes.ok || payload.error) {
      return res.status(401).json({ error: "Invalid Google credential" });
    }

    if (payload.aud !== process.env.GOOGLE_CLIENT_ID) {
      return res.status(401).json({ error: "Token audience mismatch" });
    }

    const { sub: googleId, email } = payload;
    if (!email) return res.status(401).json({ error: "No email in Google token" });

    // Find by googleId, then by email (to link existing accounts)
    let user = await User.findOne({ googleId });
    if (!user) {
      user = await User.findOne({ username: email });
      if (user) {
        user.googleId = googleId;
        await user.save();
      }
    }

    if (!user) {
      // Create a new user — password is a random unusable hash
      const randomPassword = await bcrypt.hash(Math.random().toString(36) + Date.now(), saltRounds);
      user = new User({ username: email, password: randomPassword, googleId, createdAt: new Date() });
      await user.save();
      await seedCategories(user._id);
    }

    const cookieOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    };

    const accessToken = jwt.sign({ userId: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign({ userId: user._id, username: user.username }, process.env.REFRESH_SECRET, { expiresIn: "7d" });

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie("accessToken", accessToken, { ...cookieOpts, maxAge: 15 * 60 * 1000 });
    res.cookie("refreshToken", refreshToken, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000 });

    res.json({ message: "Google signin successful", username: user.username });
  } catch (error) {
    console.error("Google auth error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;

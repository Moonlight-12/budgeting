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

    const user = await User.findById(userId).select("-password -refreshToken");

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
    if (!req.body.newUsername) {
      return res.status(400).json({ message: "New Username Required" });
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

module.exports = router;

const express = require("express");
const User = require("../models/user");
const router = express.Router();
const bcrypt = require("bcrypt");
const saltRounds = 10;
const jwt = require("jsonwebtoken");

// signup
router.post("/signup", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (user) {
      return res.status(409).json({ error: "Username already exists" });
    }
    const createdAt = new Date();
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const newUser = new User({ username, password: hashedPassword, createdAt });
    await newUser.save();
    res
      .status(201)
      .json({ message: "Signup successful", username: newUser.username });
  } catch (error) {
    console.error("Error during signup:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// signin
router.post("/signin", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const comparePassword = await bcrypt.compare(password, user.password);
    if (!comparePassword) {
      return res.status(401).json({ error: "Invalid credentials" });
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
        {expiresIn: '7d'}
    );

    user.refreshToken = refreshToken;
    await user.save()

    res.status(200).json({
      message: "Signin Successful",
      username: user.username,
      token: accessToken,
      refreshToken: refreshToken
    });
  } catch (error) {
    console.error("Error during signin:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// change password
router.post("/change-password", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = User.findOne({ username });

    const comparePassword = await bcrypt.compare(password, user.password);
    if (!comparePassword) {
      return res.status(401).json({ error: "Invalid Credentials" });
    }

    const oldPassword = await User.findOne({ password });
    if (!oldPassword) {
      return res.status(400).json({ error: "Old Password Invalid" });
    }
  } catch {
    console.error("Error changing password: ", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
  return res
    .status(200)
    .json({ message: "Change Password Successfull", user: user });
});

router.post("/refresh", async (req, res) => {
  const token = req.body.refreshToken;

  if (!token) {
    return res.status(401).json({ message: "Refresh Token Missing" });
  }

  jwt.verify(token, process.env.REFRESH_SECRET, async (err, decoded) => {
    if (err) {
      return res
        .status(403)
        .json({ message: "Invalid or Expired Refresh Token" });
    }

    const user = await User.findById(decoded.userId);
    if(!user || user.refreshToken !== token){
        return res.status(403).json({message: "Token Revoked"});
    }

    const newAccessToken = jwt.sign(
      {
        userId: decoded.userId,
        username: decoded.username
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" },
    );

    const newRefreshToken = jwt.sign(
      {
        userId: decoded.userId,
        username: decoded.username
      },
      process.env.REFRESH_SECRET,
      { expiresIn: "7d" },
    );

    user.refreshToken = newRefreshToken;
    await user.save();

    return res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken});
  });
});

module.exports = router;

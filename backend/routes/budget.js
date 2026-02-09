const express = require("express");
const authMiddleware = require("../middleware/auth");
const Budget = require("../models/budget");
const router = express.Router();

router.get("/", authMiddleware, async (req, res) => {
  try {
    let budget = await Budget.findOne({ userId: req.user.userId });

    if (!budget) {
      budget = new Budget({ userId: req.user.userId });
      await budget.save();
    }

    res.status(200).json({
      message: "Budget retrieved",
      monthlyTarget: budget.monthlyTarget,
      currency: budget.currency,
    });
  } catch (error) {
    console.error("Error fetching budget:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/", authMiddleware, async (req, res) => {
  try {
    const { monthlyTarget } = req.body;

    if (monthlyTarget === undefined || typeof monthlyTarget !== "number") {
      return res.status(400).json({ error: "monthlyTarget is required and must be a number" });
    }

    const budget = await Budget.findOneAndUpdate(
      { userId: req.user.userId },
      { monthlyTarget, updatedAt: new Date() },
      { new: true, upsert: true }
    );

    res.status(200).json({
      message: "Budget updated",
      monthlyTarget: budget.monthlyTarget,
      currency: budget.currency,
    });
  } catch (error) {
    console.error("Error updating budget:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;

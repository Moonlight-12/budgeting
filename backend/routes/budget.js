const express = require("express");
const authMiddleware = require("../middleware/auth");
const Budget = require("../models/budget");
const BudgetSavings = require("../models/budgetSavings");
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

// Get saved balance + allocations
router.get("/savings", authMiddleware, async (req, res) => {
  try {
    const savings = await BudgetSavings.findOne({ userId: req.user.userId });
    res.json({
      savedBalance: savings?.savedBalance ?? 0,
      allocations: savings?.allocations ?? [],
    });
  } catch (error) {
    console.error("Error fetching savings:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Save/replace the current period's remaining balance
router.post("/savings", authMiddleware, async (req, res) => {
  try {
    const { amount } = req.body; // in cents
    const savings = await BudgetSavings.findOneAndUpdate(
      { userId: req.user.userId },
      { savedBalance: amount },
      { new: true, upsert: true }
    );
    res.json({ savedBalance: savings.savedBalance, allocations: savings.allocations ?? [] });
  } catch (error) {
    console.error("Error saving balance:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Update allocations per category
router.put("/savings/allocate", authMiddleware, async (req, res) => {
  try {
    const { allocations } = req.body; // [{ categoryId, amount }]
    const savings = await BudgetSavings.findOneAndUpdate(
      { userId: req.user.userId },
      { allocations },
      { new: true, upsert: true }
    );
    res.json({ savedBalance: savings.savedBalance ?? 0, allocations: savings.allocations });
  } catch (error) {
    console.error("Error updating allocations:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;

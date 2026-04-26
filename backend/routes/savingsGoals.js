const express = require("express");
const router = express.Router();
const SavingsGoal = require("../models/savingsGoal");
const authMiddleware = require("../middleware/auth");

router.get("/", authMiddleware, async (req, res) => {
  try {
    const goals = await SavingsGoal.find({ userId: req.user.userId }).sort({ createdAt: 1 });
    res.json({ goals });
  } catch (error) {
    console.error("Error fetching savings goals:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/", authMiddleware, async (req, res) => {
  try {
    const { name, targetAmount, currentAmount, color, deadline } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "Name is required" });
    }
    if (typeof targetAmount !== "number" || targetAmount <= 0) {
      return res.status(400).json({ message: "targetAmount must be a positive number" });
    }
    const goal = new SavingsGoal({
      userId: req.user.userId,
      name: name.trim(),
      targetAmount,
      currentAmount: currentAmount ?? 0,
      color: color || "#10b981",
      deadline: deadline ? new Date(deadline) : undefined,
    });
    await goal.save();
    res.status(201).json({ goal });
  } catch (error) {
    console.error("Error creating savings goal:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { name, targetAmount, currentAmount, color, deadline } = req.body;
    const update = {};
    if (name !== undefined) update.name = name.trim();
    if (targetAmount !== undefined) update.targetAmount = targetAmount;
    if (currentAmount !== undefined) update.currentAmount = currentAmount;
    if (color !== undefined) update.color = color;
    if (deadline !== undefined) update.deadline = deadline ? new Date(deadline) : null;

    const goal = await SavingsGoal.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { $set: update },
      { new: true }
    );
    if (!goal) return res.status(404).json({ message: "Goal not found" });
    res.json({ goal });
  } catch (error) {
    console.error("Error updating savings goal:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const goal = await SavingsGoal.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    if (!goal) return res.status(404).json({ message: "Goal not found" });
    res.json({ message: "Goal deleted" });
  } catch (error) {
    console.error("Error deleting savings goal:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;

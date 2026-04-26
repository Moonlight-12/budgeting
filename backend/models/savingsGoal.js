const mongoose = require("mongoose");

const savingsGoalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  targetAmount: { type: Number, required: true },
  currentAmount: { type: Number, default: 0 },
  color: { type: String, default: "#10b981" },
  deadline: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("SavingsGoal", savingsGoalSchema);

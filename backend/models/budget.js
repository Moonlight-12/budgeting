const mongoose = require("mongoose");

const budgetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  monthlyTarget: { type: Number, required: true, default: 2000 },
  currency: { type: String, default: "AUD" },
  updatedAt: { type: Date, default: Date.now },
});

const Budget = mongoose.model("budget", budgetSchema);

module.exports = Budget;

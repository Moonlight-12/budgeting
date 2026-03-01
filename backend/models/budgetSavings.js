const mongoose = require("mongoose");

const budgetSavingsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  savedBalance: { type: Number, default: 0 }, // in cents
  allocations: [
    {
      categoryId: { type: String },
      amount: { type: Number, default: 0 }, // in cents
    },
  ],
});

const BudgetSavings = mongoose.model("budgetSavings", budgetSavingsSchema);

module.exports = BudgetSavings;

const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  transactionId: { type: String, required: true, unique: true },
  transactionDate: { type: Date },
  settleDate: { type: Date },
  status: { type: String },
  currency: { type: String, default: "AUD" },
  valueInCents: { type: Number, required: true },
  description: { type: String },
  categoryId: {type: String, default: "other"},
  syncedAt: { type: Date },
});

const Transaction = mongoose.model("transaction", transactionSchema);

module.exports = Transaction;

const express = require("express");
const mongoose = require("mongoose");
const authMiddleware = require("../middleware/auth");
const Transaction = require("../models/transaction");
const router = express.Router();

// Get all transactions from Up Bank and upload to DB
router.post("/sync", authMiddleware, async (req, res) => {
  try {
    const response = await fetch("https://api.up.com.au/api/v1/transactions", {
      headers: {
        Authorization: `Bearer ${process.env.UP_API_KEY}`,
      },
    });
    const data = await response.json();

    const results = { saved: 0, skipped: 0 };

    for (const tsn of data.data) {
      const exists = await Transaction.findOne({ transactionId: tsn.id });
      if (exists) {
        results.skipped++;
        continue;
      }

      const transaction = new Transaction({
        userId: req.user.userId,
        transactionId: tsn.id,
        transactionDate: tsn.attributes.createdAt,
        settleDate: tsn.attributes.settledAt,
        status: tsn.attributes.status,
        currency: tsn.attributes.amount.currencyCode,
        valueInCents: tsn.attributes.amount.valueInBaseUnits,
        description: tsn.attributes.description,
        syncedAt: new Date(),
      });

      await transaction.save();
      results.saved++;
    }

    res.json({
      message: "Sync Complete",
      saved: results.saved,
      skipped: results.skipped,
    });
  } catch (error) {
    console.error("Error fetching transactions from Up API:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/all", authMiddleware, async (req, res) => {
  try {
    const response = await Transaction.find({ userId: req.user.userId });

    res
      .status(200)
      .json({ message: "Showing All Transaction", transaction: response });
  } catch (error) {
    console.error("error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/monthly", authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const transactions = await Transaction.find({
      userId: new mongoose.Types.ObjectId(req.user.userId),
      transactionDate: { $gte: startOfMonth, $lte: endOfToday },
    }).sort({ transactionDate: -1 });

    res.status(200).json({
      message: "Monthly transactions retrieved",
      transactions,
    });
  } catch (error) {
    console.error("Error fetching monthly transactions:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/calculate-monthly", authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const result = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(req.user.userId),
          transactionDate: {
            $gte: startOfMonth,
            $lte: endOfToday,
          },
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$valueInCents" },
        },
      },
    ]);

    const totalAmount = result.length > 0 ? result[0].totalAmount : 0;

    res.status(200).json({
      message: "Monthly calculation complete",
      totalAmountInCents: totalAmount,
      totalAmount: totalAmount / 100,
      period: {
        from: startOfMonth,
        to: endOfToday,
      },
    });
  } catch (error) {
    console.error("Error calculating monthly total:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
})

module.exports = router;

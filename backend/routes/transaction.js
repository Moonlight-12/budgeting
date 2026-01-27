const express = require("express");
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

module.exports = router;

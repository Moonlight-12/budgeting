const express = require("express");
const mongoose = require("mongoose");
const authMiddleware = require("../middleware/auth");
const Transaction = require("../models/transaction");
const Category = require("../models/category");
const User = require("../models/user");
const router = express.Router();

// ─── Shared category mapping helpers ─────────────────────────────────────────

const UP_CATEGORY_DEFAULTS = {
  "restaurants-and-cafes":    { name: "Restaurants & Cafes",   color: "#f97316" },
  "groceries":                { name: "Groceries",              color: "#22c55e" },
  "transport":                { name: "Transport",              color: "#3b82f6" },
  "utilities":                { name: "Utilities",              color: "#a855f7" },
  "health-and-medical":       { name: "Health & Medical",       color: "#ec4899" },
  "entertainment":            { name: "Entertainment",          color: "#eab308" },
  "investments":              { name: "Investments",            color: "#10b981" },
  "home":                     { name: "Home",                   color: "#14b8a6" },
  "personal":                 { name: "Personal",               color: "#6366f1" },
  "education":                { name: "Education",              color: "#06b6d4" },
  "clothing-and-accessories": { name: "Clothing & Accessories", color: "#f43f5e" },
  "technology":               { name: "Technology",             color: "#64748b" },
  "travel-and-holiday":       { name: "Travel & Holiday",       color: "#f59e0b" },
  "pets":                     { name: "Pets",                   color: "#84cc16" },
  "gifts-and-charity":        { name: "Gifts & Charity",        color: "#8b5cf6" },
  "emergency-fund":           { name: "Emergency Fund",         color: "#ef4444" },
  "booze":                    { name: "Booze",                  color: "#fb923c" },
  "news-and-magazines":       { name: "News & Magazines",       color: "#94a3b8" },
  "sports-and-fitness":       { name: "Sports & Fitness",       color: "#4ade80" },
  "games-and-software":       { name: "Games & Software",       color: "#818cf8" },
  "hair-and-beauty":          { name: "Hair & Beauty",          color: "#f9a8d4" },
  "hobbies":                  { name: "Hobbies",                color: "#fdba74" },
  "adult":                    { name: "Adult",                  color: "#9ca3af" },
  "tobacconist":              { name: "Tobacconist",            color: "#78716c" },
  "parking":                  { name: "Parking",                color: "#60a5fa" },
  "toll-fees":                { name: "Toll Fees",              color: "#93c5fd" },
  "cycling":                  { name: "Cycling",                color: "#4ade80" },
  "cash":                     { name: "Cash",                   color: "#a3e635" },
  "fuel":                     { name: "Fuel",                   color: "#fbbf24" },
  "food-and-drink":           { name: "Food & Drink",           color: "#fb7185" },
  "good-life":                { name: "Good Life",              color: "#c084fc" },
};

const FALLBACK_COLORS = [
  "#f97316","#22c55e","#3b82f6","#a855f7","#ec4899",
  "#eab308","#10b981","#14b8a6","#6366f1","#06b6d4",
];

const DESCRIPTION_OVERRIDES = {
  "Auto Transfer to Investing": "investments",
  "Auto Transfer to E. Fund": "emergency-fund",
};

/**
 * Loads the user's category mappings from the DB and returns helpers for
 * resolving and auto-creating categories during sync / recategorize.
 */
async function buildCategoryHelpers(userId) {
  const userCategories = await Category.find({ userId });
  const upCategoryMap = {};
  const existingCategoryIds = new Set(userCategories.map((c) => c.categoryId));

  for (const cat of userCategories) {
    for (const upCat of cat.upCategories ?? []) {
      upCategoryMap[upCat] = cat.categoryId;
    }
  }

  let fallbackColorIndex = existingCategoryIds.size % FALLBACK_COLORS.length;

  const ensureCategory = async (categoryId) => {
    if (existingCategoryIds.has(categoryId)) return;
    existingCategoryIds.add(categoryId);

    const defaults = UP_CATEGORY_DEFAULTS[categoryId];
    const name = defaults?.name ?? categoryId
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    const color = defaults?.color ?? FALLBACK_COLORS[fallbackColorIndex++ % FALLBACK_COLORS.length];

    try {
      await Category.findOneAndUpdate(
        { userId, categoryId },
        { $setOnInsert: { category: name, budget: 0, color, upCategories: [] } },
        { upsert: true, new: false }
      );
    } catch (e) {
      if (e.code !== 11000) throw e;
    }
  };

  const resolveCategoryId = (upCategoryId, description) => {
    if (description && DESCRIPTION_OVERRIDES[description]) {
      return DESCRIPTION_OVERRIDES[description];
    }
    return upCategoryMap[upCategoryId] ?? upCategoryId ?? "other";
  };

  return { ensureCategory, resolveCategoryId };
}

// ─── Budget period helper ─────────────────────────────────────────────────────

function getBudgetPeriod(utcOffset, referenceDateMs = Date.now()) {
  const offsetMs = utcOffset * 60 * 1000;
  const nowLocal = new Date(referenceDateMs - offsetMs);
  const day = nowLocal.getUTCDate();
  const month = nowLocal.getUTCMonth();
  const year = nowLocal.getUTCFullYear();

  let startYear, startMonth, endYear, endMonth;

  if (day <= 14) {
    startMonth = month === 0 ? 11 : month - 1;
    startYear = month === 0 ? year - 1 : year;
    endMonth = month;
    endYear = year;
  } else {
    startMonth = month;
    startYear = year;
    endMonth = month === 11 ? 0 : month + 1;
    endYear = month === 11 ? year + 1 : year;
  }

  const periodStart = new Date(Date.UTC(startYear, startMonth, 12) + offsetMs);
  const periodEnd = new Date(Date.UTC(endYear, endMonth, 14, 23, 59, 59, 999) + offsetMs);

  return { periodStart, periodEnd };
}

// ─── Routes ───────────────────────────────────────────────────────────────────

router.post("/sync", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("upApiKey");
    const upApiKey = user?.upApiKey || process.env.UP_API_KEY;
    if (!upApiKey) {
      return res.status(400).json({ message: "No Up Bank API key configured. Add your token in the dashboard." });
    }

    const results = { saved: 0, skipped: 0, recategorized: 0 };
    const { ensureCategory, resolveCategoryId } = await buildCategoryHelpers(req.user.userId);

    const full = req.query.full === "true";

    let sinceParam = "";
    if (!full) {
      const latest = await Transaction.findOne({ userId: req.user.userId })
        .sort({ transactionDate: -1, settleDate: -1 })
        .select("transactionDate settleDate");
      const sinceDate = latest?.transactionDate || latest?.settleDate;
      sinceParam = sinceDate ? `&filter[since]=${sinceDate.toISOString()}` : "";
    }

    let nextUrl = `https://api.up.com.au/api/v1/transactions?page[size]=100${sinceParam}`;

    while (nextUrl) {
      const response = await fetch(nextUrl, {
        headers: { Authorization: `Bearer ${upApiKey}` },
      });
      const data = await response.json();

      for (const tsn of data.data) {
        const upCategoryId = tsn.relationships?.category?.data?.id ?? null;
        const description = tsn.attributes.description;
        const categoryId = resolveCategoryId(upCategoryId, description);
        await ensureCategory(categoryId);

        const exists = await Transaction.findOne({ transactionId: tsn.id });
        if (exists) {
          if (full || exists.categoryId !== categoryId) {
            await Transaction.updateOne({ _id: exists._id }, { categoryId, upCategoryId });
            results.recategorized++;
          }
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
          categoryId,
          upCategoryId,
          syncedAt: new Date(),
        });

        await transaction.save();
        results.saved++;
      }

      nextUrl = data.links?.next || null;
    }

    res.json({ message: "Sync Complete", ...results });
  } catch (error) {
    console.error("Error fetching transactions from Up API:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * Re-applies the current category mappings to all stored transactions without
 * fetching anything from Up Bank. Use this after updating category mappings.
 */
router.post("/recategorize", authMiddleware, async (req, res) => {
  try {
    const { ensureCategory, resolveCategoryId } = await buildCategoryHelpers(req.user.userId);

    const transactions = await Transaction.find(
      { userId: req.user.userId },
      { _id: 1, upCategoryId: 1, description: 1, categoryId: 1 }
    );

    let updated = 0;

    for (const txn of transactions) {
      const newCategoryId = resolveCategoryId(txn.upCategoryId, txn.description);
      await ensureCategory(newCategoryId);

      if (txn.categoryId !== newCategoryId) {
        await Transaction.updateOne({ _id: txn._id }, { categoryId: newCategoryId });
        updated++;
      }
    }

    res.json({ message: "Recategorization complete", updated, total: transactions.length });
  } catch (error) {
    console.error("Error recategorizing transactions:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/up-categories", authMiddleware, async (req, res) => {
  try {
    const upCategories = await Transaction.distinct("upCategoryId", {
      userId: req.user.userId,
      upCategoryId: { $nin: [null, ""] },
    });
    res.json({ upCategories: upCategories.sort() });
  } catch (error) {
    console.error("Error fetching Up categories:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/all", authMiddleware, async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user.userId })
      .sort({ transactionDate: -1, settleDate: -1 });
    res.status(200).json({ message: "Showing All Transaction", transactions });
  } catch (error) {
    console.error("error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/monthly", authMiddleware, async (req, res) => {
  try {
    const { periodStart, periodEnd } = getBudgetPeriod(parseInt(req.query.utcOffset) || 0);

    const transactions = await Transaction.find({
      userId: new mongoose.Types.ObjectId(req.user.userId),
      $or: [
        { transactionDate: { $gte: periodStart, $lte: periodEnd } },
        { transactionDate: null, settleDate: { $gte: periodStart, $lte: periodEnd } },
      ],
    }).sort({ transactionDate: -1, settleDate: -1 });

    res.status(200).json({ message: "Monthly transactions retrieved", transactions });
  } catch (error) {
    console.error("Error fetching monthly transactions:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/calculate-monthly", authMiddleware, async (req, res) => {
  try {
    const { periodStart, periodEnd } = getBudgetPeriod(parseInt(req.query.utcOffset) || 0);
    const result = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(req.user.userId),
          $or: [
            { transactionDate: { $gte: periodStart, $lte: periodEnd } },
            { transactionDate: null, settleDate: { $gte: periodStart, $lte: periodEnd } },
          ],
          valueInCents: { $lt: 0 },
        },
      },
      { $group: { _id: null, totalAmount: { $sum: "$valueInCents" } } },
    ]);

    const totalAmount = result.length > 0 ? result[0].totalAmount : 0;

    res.status(200).json({
      message: "Monthly calculation complete",
      totalAmountInCents: totalAmount,
      totalAmount: totalAmount / 100,
      period: { from: periodStart, to: periodEnd },
    });
  } catch (error) {
    console.error("Error calculating monthly total:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/categories-summary", authMiddleware, async (req, res) => {
  try {
    const utcOffset = parseInt(req.query.utcOffset) || 0;
    const { periodStart, periodEnd } = getBudgetPeriod(utcOffset);
    const { periodStart: prevStart, periodEnd: prevEnd } = getBudgetPeriod(utcOffset, periodStart.getTime() - 1);

    const userId = new mongoose.Types.ObjectId(req.user.userId);

    const periodMatch = (start, end) => ({
      userId,
      valueInCents: { $lt: 0 },
      $or: [
        { transactionDate: { $gte: start, $lte: end } },
        { transactionDate: null, settleDate: { $gte: start, $lte: end } },
      ],
    });

    const [current, previous] = await Promise.all([
      Transaction.aggregate([
        { $match: periodMatch(periodStart, periodEnd) },
        { $group: { _id: "$categoryId", totalInCents: { $sum: "$valueInCents" } } },
      ]),
      Transaction.aggregate([
        { $match: periodMatch(prevStart, prevEnd) },
        { $group: { _id: "$categoryId", totalInCents: { $sum: "$valueInCents" } } },
      ]),
    ]);

    res.json({
      current,
      previous,
      period: { from: periodStart, to: periodEnd },
      previousPeriod: { from: prevStart, to: prevEnd },
    });
  } catch (error) {
    console.error("Error fetching categories summary:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/summary", authMiddleware, async (req, res) => {
  try {
    const utcOffset = parseInt(req.query.utcOffset) || 0;
    const { periodStart, periodEnd } = getBudgetPeriod(utcOffset);
    const userId = new mongoose.Types.ObjectId(req.user.userId);

    const [result] = await Transaction.aggregate([
      {
        $match: {
          userId,
          $or: [
            { transactionDate: { $gte: periodStart, $lte: periodEnd } },
            { transactionDate: null, settleDate: { $gte: periodStart, $lte: periodEnd } },
          ],
        },
      },
      {
        $group: {
          _id: null,
          totalSpending: { $sum: { $cond: [{ $lt: ["$valueInCents", 0] }, "$valueInCents", 0] } },
          totalIncome: { $sum: { $cond: [{ $gt: ["$valueInCents", 0] }, "$valueInCents", 0] } },
          avgTransaction: { $avg: "$valueInCents" },
          biggestExpense: { $min: "$valueInCents" },
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      totalSpending: result?.totalSpending ?? 0,
      totalIncome: result?.totalIncome ?? 0,
      avgTransaction: result?.avgTransaction ?? 0,
      biggestExpense: result?.biggestExpense ?? 0,
      count: result?.count ?? 0,
      period: { from: periodStart, to: periodEnd },
    });
  } catch (error) {
    console.error("Error fetching summary:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Update a single transaction's category
router.patch("/:id", authMiddleware, async (req, res) => {
  try {
    const { categoryId } = req.body;
    if (!categoryId) {
      return res.status(400).json({ message: "categoryId is required" });
    }

    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { $set: { categoryId } },
      { new: true }
    );

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    res.json({ message: "Transaction updated", transaction });
  } catch (error) {
    console.error("Error updating transaction:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;

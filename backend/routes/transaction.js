const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const authMiddleware = require("../middleware/auth");
const Transaction = require("../models/transaction");
const Category = require("../models/category");
const User = require("../models/user");
const { decrypt } = require("../utils/encrypt");
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

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

router.get("/accounts", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("upApiKey");
    const upApiKey = (user?.upApiKey ? decrypt(user.upApiKey) : null) || process.env.UP_API_KEY;
    if (!upApiKey) return res.status(400).json({ message: "No Up Bank API key configured." });

    const response = await fetch("https://api.up.com.au/api/v1/accounts", {
      headers: { Authorization: `Bearer ${upApiKey}` },
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/sync", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("upApiKey");
    const upApiKey = (user?.upApiKey ? decrypt(user.upApiKey) : null) || process.env.UP_API_KEY;
    if (!upApiKey) {
      return res.status(400).json({ message: "No Up Bank API key configured. Add your token in the dashboard." });
    }

    const results = { saved: 0, skipped: 0, recategorized: 0 };
    const { ensureCategory, resolveCategoryId } = await buildCategoryHelpers(req.user.userId);

    const full = req.query.full === "true";

    // Resolve the spendings (TRANSACTIONAL) account ID
    const accountsResponse = await fetch("https://api.up.com.au/api/v1/accounts", {
      headers: { Authorization: `Bearer ${upApiKey}` },
    });
    const accountsData = await accountsResponse.json();
    const availableAccounts = accountsData.data?.map((a) => ({
      id: a.id,
      displayName: a.attributes?.displayName,
      accountType: a.attributes?.accountType,
      ownershipType: a.attributes?.ownershipType,
    })) ?? [];

    const spendingsAccount = accountsData.data?.find(
      (a) => a.attributes?.accountType === "TRANSACTIONAL"
    );
    if (!spendingsAccount) {
      return res.status(400).json({
        message: "Could not find a TRANSACTIONAL (spendings) account in Up Bank.",
        availableAccounts,
      });
    }
    let sinceParam = "";
    if (!full) {
      const latest = await Transaction.findOne({ userId: req.user.userId, accountId: spendingsAccount.id })
        .sort({ transactionDate: -1, settleDate: -1 })
        .select("transactionDate settleDate");
      const sinceDate = latest?.transactionDate || latest?.settleDate;
      sinceParam = sinceDate ? `?page[size]=100&filter[since]=${sinceDate.toISOString()}` : "?page[size]=100";
    } else {
      sinceParam = "?page[size]=100";
    }

    let nextUrl = `https://api.up.com.au/api/v1/accounts/${spendingsAccount.id}/transactions${sinceParam}`;

    const seenTransactionIds = new Set();

    while (nextUrl) {
      const response = await fetch(nextUrl, {
        headers: { Authorization: `Bearer ${upApiKey}` },
      });
      const data = await response.json();

      for (const tsn of data.data) {
        seenTransactionIds.add(tsn.id);

        const upCategoryId = tsn.relationships?.category?.data?.id ?? null;
        const description = tsn.attributes.description;
        const categoryId = resolveCategoryId(upCategoryId, description);
        await ensureCategory(categoryId);

        const exists = await Transaction.findOne({ transactionId: tsn.id });
        if (exists) {
          if (full || exists.categoryId !== categoryId || !exists.accountId) {
            await Transaction.updateOne({ _id: exists._id }, { categoryId, upCategoryId, accountId: spendingsAccount.id });
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
          accountId: spendingsAccount.id,
          syncedAt: new Date(),
        });

        await transaction.save();
        results.saved++;
      }

      nextUrl = data.links?.next || null;
    }

    if (full) {
      const deleted = await Transaction.deleteMany({
        userId: req.user.userId,
        transactionId: { $nin: Array.from(seenTransactionIds) },
      });
      results.deleted = deleted.deletedCount;
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

router.post("/manual", authMiddleware, async (req, res) => {
  try {
    const { description, amount, date, categoryId, currency } = req.body;
    if (!description || typeof description !== "string" || !description.trim()) {
      return res.status(400).json({ message: "Description is required" });
    }
    if (typeof amount !== "number" || isNaN(amount)) {
      return res.status(400).json({ message: "Amount is required" });
    }
    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }
    const resolvedCurrency = currency === "IDR" ? "IDR" : "AUD";
    // IDR has no subunits in practice — store as whole rupiah; AUD stored as cents
    const valueInCents = resolvedCurrency === "IDR" ? Math.round(amount) : Math.round(amount * 100);
    const transactionId = `manual-${req.user.userId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const transaction = new Transaction({
      userId: req.user.userId,
      transactionId,
      description: description.trim(),
      valueInCents,
      transactionDate: new Date(date),
      categoryId: categoryId || "other",
      status: "SETTLED",
      currency: resolvedCurrency,
    });
    await transaction.save();
    res.status(201).json({ message: "Transaction added", transaction });
  } catch (error) {
    console.error("Error adding manual transaction:", error);
    res.status(500).json({ message: "Internal Server Error" });
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

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId,
    });
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }
    res.json({ message: "Transaction deleted" });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Universal bank CSV import
// Auto-detects column positions from header row (Date, Amount, Description).
// Supports date formats: DD/MM/YYYY, YYYY-MM-DD, MM/DD/YYYY.
// Falls back to positional (col 0 = date, col 1 = amount, col 2 = description) if no header.
router.post("/import-csv", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const text = req.file.buffer.toString("utf8");
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length === 0) return res.status(400).json({ message: "Empty file" });

    function parseCsvRow(line) {
      const cols = [];
      let cur = "", inQuote = false;
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') { inQuote = !inQuote; }
        else if (line[i] === "," && !inQuote) { cols.push(cur.trim()); cur = ""; }
        else { cur += line[i]; }
      }
      cols.push(cur.trim());
      return cols;
    }

    function parseDate(str) {
      const s = str.trim();
      let d, m, y;
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) {       // YYYY-MM-DD (ISO)
        [y, m, d] = s.slice(0, 10).split("-").map(Number);
      } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) { // DD/MM/YYYY or MM/DD/YYYY
        const [a, b, c] = s.split("/").map(Number);
        // Assume DD/MM/YYYY (AU standard); if day > 12 it must be DD
        d = a; m = b; y = c;
      } else {
        return null;
      }
      const date = new Date(Date.UTC(y, m - 1, d));
      return isNaN(date.getTime()) ? null : date;
    }

    // Detect header row: if first cell is not a date pattern, treat as header
    const headerCols = parseCsvRow(lines[0]).map((c) => c.toLowerCase().replace(/[^a-z]/g, ""));
    const hasHeader = !/^\d/.test(lines[0].trim());

    // Find column indices — match common header names across banks
    let dateIdx = 0, amountIdx = 1, descIdx = 2;
    let debitIdx = -1, creditIdx = -1; // for banks with separate debit/credit columns (e.g. Westpac)
    if (hasHeader) {
      const dateNames = ["date", "transactiondate", "txndate", "valuedate", "posteddate"];
      const amountNames = ["amount", "debitamount", "creditamount", "transactionamount", "value"];
      const descNames = ["description", "narrative", "narration", "details", "memo", "particulars", "reference", "txndescription"];

      const di = headerCols.findIndex((h) => dateNames.includes(h));
      const ai = headerCols.findIndex((h) => amountNames.includes(h));
      const xi = headerCols.findIndex((h) => descNames.includes(h));
      // Match "Debit", "Debit Amount", "DebitAmount", etc.
      const dbi = headerCols.findIndex((h) => h === "debit" || h.startsWith("debit"));
      const cri = headerCols.findIndex((h) => h === "credit" || h.startsWith("credit"));

      if (di !== -1) dateIdx = di;
      if (xi !== -1) descIdx = xi;
      // Separate debit/credit columns take precedence over a single amount column
      if (dbi !== -1 && cri !== -1) {
        debitIdx = dbi;
        creditIdx = cri;
      } else if (ai !== -1) {
        amountIdx = ai;
      }
    }

    const dataLines = hasHeader ? lines.slice(1) : lines;
    if (dataLines.length === 0) return res.status(400).json({ message: "No data rows found in CSV" });

    const results = { saved: 0, skipped: 0, errors: 0 };

    for (const line of dataLines) {
      const cols = parseCsvRow(line);

      const txnDate = parseDate(cols[dateIdx]);
      if (!txnDate) { results.errors++; continue; }

      let amount;
      if (debitIdx !== -1 && creditIdx !== -1) {
        // Westpac-style: debit is positive (expense), credit is positive (income)
        const debit = parseFloat(cols[debitIdx]?.replace(/[^0-9.]/g, "") || "0");
        const credit = parseFloat(cols[creditIdx]?.replace(/[^0-9.]/g, "") || "0");
        amount = (credit || 0) - (debit || 0);
      } else {
        const amountStr = cols[amountIdx]?.replace(/[^0-9.\-]/g, "");
        amount = parseFloat(amountStr);
      }
      if (isNaN(amount)) { results.errors++; continue; }

      const desc = (cols[descIdx] ?? "").trim() || "Imported transaction";
      const valueInCents = Math.round(amount * 100);
      const dateKey = txnDate.toISOString().slice(0, 10);
      const transactionId = `csv-${req.user.userId}-${dateKey}-${valueInCents}-${desc.slice(0, 40)}`;

      const exists = await Transaction.findOne({ transactionId });
      if (exists) { results.skipped++; continue; }

      await new Transaction({
        userId: req.user.userId,
        transactionId,
        description: desc,
        valueInCents,
        transactionDate: txnDate,
        settleDate: txnDate,
        status: "SETTLED",
        currency: "AUD",
        categoryId: "other",
      }).save();
      results.saved++;
    }

    res.json({ message: "Import complete", ...results });
  } catch (error) {
    console.error("Error importing CSV:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;

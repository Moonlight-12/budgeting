"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { TrendingDown, TrendingUp, Minus, X, Pencil, Check, PiggyBank, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

interface Category {
  _id: string;
  categoryId: string;
  category: string;
  budget: number;
  color: string;
}

interface CategorySpend {
  _id: string;
  totalInCents: number;
}

interface Row {
  categoryId: string;
  name: string;
  color: string;
  budgetCents: number;
  allocationCents: number;
  spentCents: number;
  prevSpentCents: number;
}

interface Transaction {
  _id: string;
  description: string;
  valueInCents: number;
  transactionDate: string | null;
  settleDate: string | null;
  categoryId: string;
}

interface Allocation {
  categoryId: string;
  amount: number;
}

function fmt(cents: number) {
  return `$${(Math.abs(cents) / 100).toLocaleString("en-AU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function fmtFull(cents: number) {
  const sign = cents < 0 ? "-" : "+";
  return `${sign}$${(Math.abs(cents) / 100).toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getDate(txn: Transaction) {
  const raw = txn.transactionDate ?? txn.settleDate;
  if (!raw) return "—";
  return new Date(raw).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function CategoryTransactionsModal({ row, onClose, onBudgetSaved, periodFrom, periodTo }: { row: Row; onClose: () => void; onBudgetSaved: (newBudgetCents: number) => void; periodFrom: string; periodTo: string }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState(String(row.budgetCents / 100));
  const [saving, setSaving] = useState(false);
  const [currentBudgetCents, setCurrentBudgetCents] = useState(row.budgetCents);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const from = new Date(periodFrom).getTime();
    const to = new Date(periodTo).getTime();
    fetch("/api/transactions/all")
      .then((r) => r.json())
      .then((data) => {
        const all: Transaction[] = data.transactions ?? [];
        setTransactions(
          all.filter((t) => {
            if (t.categoryId !== row.categoryId) return false;
            const d = new Date(t.transactionDate ?? t.settleDate ?? "").getTime();
            return d >= from && d <= to;
          })
        );
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [row.categoryId, periodFrom, periodTo]);

  useEffect(() => {
    if (editingBudget) inputRef.current?.focus();
  }, [editingBudget]);

  const saveBudget = async () => {
    const value = parseFloat(budgetInput);
    if (isNaN(value) || value < 0) return;
    setSaving(true);
    await fetch(`/api/categories/${row.categoryId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ budget: value }),
    });
    const newCents = Math.round(value * 100);
    setSaving(false);
    setCurrentBudgetCents(newCents);
    setEditingBudget(false);
    onBudgetSaved(newCents);
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 shrink-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
            <h2 className="text-white font-semibold">{row.name}</h2>
            {!loading && (
              <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
                {transactions.length} transactions
              </span>
            )}
            {/* Budget inline edit */}
            {editingBudget ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-zinc-500">$</span>
                <input
                  ref={inputRef}
                  type="number"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveBudget(); if (e.key === "Escape") setEditingBudget(false); }}
                  className="w-24 bg-zinc-800 border border-white/15 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-white/30"
                />
                <button
                  onClick={saveBudget}
                  disabled={saving}
                  className="p-1 text-emerald-400 hover:text-emerald-300 disabled:opacity-50 transition-colors"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={() => setEditingBudget(false)}
                  className="p-1 text-zinc-500 hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setBudgetInput(String(currentBudgetCents / 100)); setEditingBudget(true); }}
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <Pencil size={11} />
                {currentBudgetCents > 0 ? `$${currentBudgetCents / 100}/mo` : "set budget"}
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <p className="text-zinc-500 text-sm text-center py-10">Loading...</p>
          ) : transactions.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-10">No transactions in this category</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {transactions.map((txn) => {
                  const isNegative = txn.valueInCents < 0;
                  return (
                    <tr key={txn._id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                      <td className="px-5 py-3 text-zinc-400 whitespace-nowrap text-xs">{getDate(txn)}</td>
                      <td className="px-4 py-3 text-white truncate max-w-[240px]">{txn.description}</td>
                      <td className={`px-5 py-3 text-right font-medium tabular-nums whitespace-nowrap ${isNegative ? "text-rose-400" : "text-emerald-400"}`}>
                        {fmtFull(txn.valueInCents)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CategoriesTable() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodLabel, setPeriodLabel] = useState("");
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [selectedRow, setSelectedRow] = useState<Row | null>(null);

  // Savings / allocation state
  const [savedBalance, setSavedBalance] = useState(0);
  const [showAllocationPanel, setShowAllocationPanel] = useState(false);
  const [allocationDraft, setAllocationDraft] = useState<Record<string, string>>({});
  const [savingBalance, setSavingBalance] = useState(false);
  const [savingAllocations, setSavingAllocations] = useState(false);

  useEffect(() => {
    const utcOffset = new Date().getTimezoneOffset();

    Promise.all([
      fetch(`/api/transactions/categories-summary?utcOffset=${utcOffset}`).then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/budget/savings").then((r) => r.json()),
    ])
      .then(([summaryData, categoriesData, savingsData]) => {
        const categories: Category[] = categoriesData.categories ?? [];
        const current: CategorySpend[] = summaryData.current ?? [];
        const previous: CategorySpend[] = summaryData.previous ?? [];
        const allocations: Allocation[] = savingsData.allocations ?? [];

        const currentMap = Object.fromEntries(current.map((c) => [c._id, c.totalInCents]));
        const previousMap = Object.fromEntries(previous.map((c) => [c._id, c.totalInCents]));
        const allocationMap = Object.fromEntries(allocations.map((a) => [a.categoryId, a.amount]));

        const allCategoryIds = new Set([
          ...categories.map((c) => c.categoryId),
          ...current.map((c) => c._id),
        ]);

        const merged: Row[] = Array.from(allCategoryIds).map((id) => {
          const cat = categories.find((c) => c.categoryId === id);
          return {
            categoryId: id,
            name: cat?.category ?? id,
            color: cat?.color ?? "#6b7280",
            budgetCents: (cat?.budget ?? 0) * 100,
            allocationCents: allocationMap[id] ?? 0,
            spentCents: Math.abs(currentMap[id] ?? 0),
            prevSpentCents: Math.abs(previousMap[id] ?? 0),
          };
        });

        merged.sort((a, b) => b.spentCents - a.spentCents);
        setRows(merged);
        setSavedBalance(savingsData.savedBalance ?? 0);

        // Initialize allocation draft from existing allocations
        const draft: Record<string, string> = {};
        for (const a of allocations) {
          if (a.amount > 0) draft[a.categoryId] = String(a.amount / 100);
        }
        setAllocationDraft(draft);

        if (summaryData.period?.from) {
          const from = new Date(summaryData.period.from).toLocaleDateString("en-AU", {
            day: "numeric",
            month: "short",
          });
          const to = new Date(summaryData.period.to).toLocaleDateString("en-AU", {
            day: "numeric",
            month: "short",
          });
          setPeriodFrom(summaryData.period.from);
          setPeriodTo(summaryData.period.to);
          setPeriodLabel(`${from} – ${to}`);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Compute totals
  const totals = useMemo(() => {
    const totalBudget = rows.reduce((s, r) => s + r.budgetCents + r.allocationCents, 0);
    const totalSpent = rows.reduce((s, r) => s + r.spentCents, 0);
    const totalRemaining = totalBudget - totalSpent;
    return { totalBudget, totalSpent, totalRemaining };
  }, [rows]);

  // Compute allocated total from draft
  const draftAllocatedTotal = useMemo(() => {
    return Object.values(allocationDraft).reduce((s, v) => {
      const n = parseFloat(v);
      return s + (isNaN(n) ? 0 : Math.round(n * 100));
    }, 0);
  }, [allocationDraft]);

  const unallocatedBalance = savedBalance - draftAllocatedTotal;

  const handleSaveRemaining = async () => {
    const amount = totals.totalRemaining;
    if (amount <= 0) return;
    setSavingBalance(true);
    try {
      const res = await fetch("/api/budget/savings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (res.ok) setSavedBalance(data.savedBalance ?? amount);
    } catch (e) {
      console.error("Failed to save balance:", e);
    } finally {
      setSavingBalance(false);
    }
  };

  const handleApplyAllocations = async () => {
    const allocations: Allocation[] = Object.entries(allocationDraft)
      .map(([categoryId, val]) => ({
        categoryId,
        amount: Math.round((parseFloat(val) || 0) * 100),
      }))
      .filter((a) => a.amount > 0);

    setSavingAllocations(true);
    try {
      const res = await fetch("/api/budget/savings/allocate", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allocations }),
      });
      if (res.ok) {
        const allocationMap = Object.fromEntries(allocations.map((a) => [a.categoryId, a.amount]));
        setRows((prev) =>
          prev.map((r) => ({
            ...r,
            allocationCents: allocationMap[r.categoryId] ?? 0,
          }))
        );
      }
    } catch (e) {
      console.error("Failed to apply allocations:", e);
    } finally {
      setSavingAllocations(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-white/8 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between border-b border-white/8">
        <h2 className="text-sm font-semibold text-white">Spending by Category</h2>
        <div className="flex items-center gap-3">
          {periodLabel && (
            <span className="text-xs text-zinc-500">{periodLabel}</span>
          )}
          {savedBalance > 0 && (
            <span className="text-xs text-emerald-400/80 bg-emerald-400/10 px-2 py-0.5 rounded-full">
              <PiggyBank size={11} className="inline mr-1 -mt-0.5" />
              {fmt(savedBalance)} saved
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-5 py-3 text-xs text-zinc-500 font-medium uppercase tracking-wider">
                Category
              </th>
              <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-wider">
                Budget
              </th>
              <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-wider">
                Spent
              </th>
              <th className="px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-wider min-w-[120px]">
                Progress
              </th>
              <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-wider">
                Remaining
              </th>
              <th className="text-right px-5 py-3 text-xs text-zinc-500 font-medium uppercase tracking-wider">
                vs Last Period
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-zinc-500">
                  Loading...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-zinc-500">
                  No data for this period
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const effectiveBudget = row.budgetCents + row.allocationCents;
                const pct = effectiveBudget > 0
                  ? (row.spentCents / effectiveBudget) * 100
                  : 0;
                const barPct = Math.min(pct, 100);
                const remaining = effectiveBudget - row.spentCents;
                const overBudget = remaining < 0;
                const diff = row.spentCents - row.prevSpentCents;

                return (
                  <tr
                    key={row.categoryId}
                    onClick={() => setSelectedRow(row)}
                    className="border-b border-white/5 hover:bg-white/2 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: row.color }}
                        />
                        <span className="text-white font-medium">{row.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right text-zinc-400">
                      {effectiveBudget > 0 ? (
                        <span>
                          {fmt(row.budgetCents)}
                          {row.allocationCents > 0 && (
                            <span className="text-emerald-400/70 text-xs ml-1">
                              +{fmt(row.allocationCents)}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right text-white font-medium">
                      {fmt(row.spentCents)}
                    </td>
                    <td className="px-4 py-3.5">
                      {effectiveBudget > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${barPct}%`,
                                backgroundColor: overBudget ? "#f43f5e" : row.color,
                              }}
                            />
                          </div>
                          <span className={`text-xs w-8 text-right ${overBudget ? "text-rose-400" : "text-zinc-500"}`}>
                            {Math.round(pct)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-zinc-600 text-xs">no budget set</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {effectiveBudget > 0 ? (
                        <span className={overBudget ? "text-rose-400" : "text-emerald-400"}>
                          {overBudget ? `-${fmt(Math.abs(remaining))}` : fmt(remaining)}
                        </span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {row.prevSpentCents === 0 && row.spentCents === 0 ? (
                        <span className="text-zinc-600">—</span>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          {diff === 0 ? (
                            <Minus size={12} className="text-zinc-500" />
                          ) : diff > 0 ? (
                            <TrendingUp size={12} className="text-rose-400" />
                          ) : (
                            <TrendingDown size={12} className="text-emerald-400" />
                          )}
                          <span
                            className={`text-xs font-medium ${
                              diff === 0
                                ? "text-zinc-500"
                                : diff > 0
                                ? "text-rose-400"
                                : "text-emerald-400"
                            }`}
                          >
                            {diff === 0 ? "—" : `${diff > 0 ? "+" : "-"}${fmt(Math.abs(diff))}`}
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Total remaining row */}
          {!loading && rows.length > 0 && (
            <tfoot>
              <tr className="border-t border-white/10 bg-white/[0.02]">
                <td className="px-5 py-3.5">
                  <span className="text-white font-semibold text-xs uppercase tracking-wider">Total</span>
                </td>
                <td className="px-4 py-3.5 text-right text-zinc-300 font-semibold">
                  {totals.totalBudget > 0 ? fmt(totals.totalBudget) : "—"}
                </td>
                <td className="px-4 py-3.5 text-right text-white font-semibold">
                  {fmt(totals.totalSpent)}
                </td>
                <td className="px-4 py-3.5">
                  {totals.totalBudget > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all bg-white/30"
                          style={{ width: `${Math.min((totals.totalSpent / totals.totalBudget) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-zinc-500 w-8 text-right">
                        {Math.round((totals.totalSpent / totals.totalBudget) * 100)}%
                      </span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3.5 text-right">
                  {totals.totalBudget > 0 && (
                    <span className={`font-semibold ${totals.totalRemaining < 0 ? "text-rose-400" : "text-emerald-400"}`}>
                      {totals.totalRemaining < 0
                        ? `-${fmt(Math.abs(totals.totalRemaining))}`
                        : fmt(totals.totalRemaining)}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-right">
                  {totals.totalRemaining > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveRemaining();
                      }}
                      disabled={savingBalance}
                      className="text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-400/10 hover:bg-emerald-400/15 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1 ml-auto"
                    >
                      {savingBalance ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : (
                        <PiggyBank size={11} />
                      )}
                      Save
                    </button>
                  )}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Allocation panel */}
      {savedBalance > 0 && !loading && (
        <div className="border-t border-white/8">
          <button
            onClick={() => setShowAllocationPanel((v) => !v)}
            className="w-full px-5 py-3 flex items-center justify-between text-sm text-zinc-400 hover:text-white hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-2">
              <PiggyBank size={14} className="text-emerald-400" />
              <span>
                Allocate Saved Balance{" "}
                <span className="text-emerald-400 font-medium">{fmt(savedBalance)}</span>
              </span>
            </div>
            {showAllocationPanel ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showAllocationPanel && (
            <div className="px-5 pb-5 space-y-3">
              {/* Unallocated indicator */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">
                  Allocated: <span className="text-white">{fmt(draftAllocatedTotal)}</span>
                </span>
                <span className={unallocatedBalance < 0 ? "text-rose-400" : "text-emerald-400"}>
                  {unallocatedBalance < 0 ? "Over by " : "Remaining: "}
                  {fmt(Math.abs(unallocatedBalance))}
                </span>
              </div>

              {/* Progress bar for allocation pool */}
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min((draftAllocatedTotal / savedBalance) * 100, 100)}%`,
                    backgroundColor: unallocatedBalance < 0 ? "#f43f5e" : "#10b981",
                  }}
                />
              </div>

              {/* Per-category allocation inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {rows
                  .filter((r) => r.budgetCents > 0)
                  .map((row) => (
                    <div
                      key={row.categoryId}
                      className="flex items-center gap-2 bg-zinc-800/50 rounded-lg px-3 py-2"
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: row.color }}
                      />
                      <span className="text-xs text-zinc-300 flex-1 truncate">
                        {row.name}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-zinc-500">$</span>
                        <input
                          type="number"
                          placeholder="0"
                          value={allocationDraft[row.categoryId] ?? ""}
                          onChange={(e) =>
                            setAllocationDraft((prev) => ({
                              ...prev,
                              [row.categoryId]: e.target.value,
                            }))
                          }
                          className="w-16 bg-zinc-900 border border-white/10 rounded px-2 py-1 text-xs text-white text-right focus:outline-none focus:border-white/25 tabular-nums"
                        />
                      </div>
                    </div>
                  ))}
              </div>

              {/* Apply button */}
              <button
                onClick={handleApplyAllocations}
                disabled={savingAllocations || unallocatedBalance < 0}
                className="w-full mt-2 px-4 py-2 text-sm font-medium rounded-lg bg-emerald-500 text-white hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {savingAllocations && <Loader2 size={14} className="animate-spin" />}
                Apply Allocations
              </button>
            </div>
          )}
        </div>
      )}

      {selectedRow && (
        <CategoryTransactionsModal
          row={selectedRow}
          onClose={() => setSelectedRow(null)}
          periodFrom={periodFrom}
          periodTo={periodTo}
          onBudgetSaved={(newBudgetCents) => {
            setRows((prev) =>
              prev.map((r) =>
                r.categoryId === selectedRow.categoryId ? { ...r, budgetCents: newBudgetCents } : r
              )
            );
            setSelectedRow((r) => r ? { ...r, budgetCents: newBudgetCents } : r);
          }}
        />
      )}
    </div>
  );
}

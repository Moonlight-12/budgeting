"use client";

import { CircularProgress } from "@heroui/progress";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

interface Transaction {
  _id: string;
  description: string;
  valueInCents: number;
  transactionDate: string | null;
  settleDate: string | null;
  categoryId: string;
}

function fmtAmount(cents: number) {
  const sign = cents < 0 ? "-" : "+";
  return `${sign}$${(Math.abs(cents) / 100).toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtDate(raw: string | null) {
  if (!raw) return "—";
  return new Date(raw).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
  });
}

function SpendingModal({
  onClose,
  spending,
  budget,
}: {
  onClose: () => void;
  spending: number;
  budget: number;
}) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const utcOffset = new Date().getTimezoneOffset();
    fetch(`/api/transactions/monthly?utcOffset=${utcOffset}`)
      .then((r) => r.json())
      .then((data) => setTransactions(data.transactions ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // Only show expenses (negative amounts)
  const expenses = transactions
    .filter((t) => t.valueInCents < 0)
    .sort((a, b) => {
      const da = new Date(a.transactionDate ?? a.settleDate ?? "").getTime();
      const db = new Date(b.transactionDate ?? b.settleDate ?? "").getTime();
      return db - da;
    });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-lg max-h-[80vh] bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Current Period Spending
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              ${spending.toFixed(0)} spent of ${budget} budget
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Summary bar */}
        <div className="px-5 py-3 border-b border-white/5 flex items-center gap-3">
          <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min((spending / budget) * 100, 100)}%`,
                backgroundColor: spending > budget ? "#f43f5e" : "#10b981",
              }}
            />
          </div>
          <span className="text-xs text-zinc-500 tabular-nums shrink-0">
            {budget > 0 ? `${Math.round((spending / budget) * 100)}%` : "—"}
          </span>
        </div>

        {/* Transaction list */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <p className="text-zinc-500 text-sm text-center py-10">
              Loading...
            </p>
          ) : expenses.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-10">
              No spending this period
            </p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {expenses.map((txn) => (
                  <tr
                    key={txn._id}
                    className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-5 py-3 text-zinc-500 whitespace-nowrap text-xs w-16">
                      {fmtDate(txn.transactionDate ?? txn.settleDate)}
                    </td>
                    <td className="px-3 py-3 text-white truncate max-w-[240px]">
                      {txn.description}
                    </td>
                    <td className="px-5 py-3 text-right text-rose-400 font-medium tabular-nums whitespace-nowrap">
                      {fmtAmount(txn.valueInCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        {!loading && expenses.length > 0 && (
          <div className="px-5 py-3 border-t border-white/8 flex items-center justify-between text-xs text-zinc-500 shrink-0">
            <span>{expenses.length} transactions</span>
            <span className="text-white font-medium">
              Total: ${spending.toFixed(2)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Chart() {
  const [spending, setSpending] = useState(0);
  const [budget, setBudget] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const utcOffset = new Date().getTimezoneOffset();
    Promise.all([
      fetch(`/api/transactions/calculate-monthly?utcOffset=${utcOffset}`),
      fetch("/api/budget"),
    ])
      .then(async ([spendingRes, budgetRes]) => {
        const spendingData = await spendingRes.json();
        const budgetData = await budgetRes.json();
        setSpending(Math.abs(spendingData.totalAmount || 0));
        setBudget(budgetData.monthlyTarget || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const remaining = budget - spending;
  const percentage = budget > 0 ? Math.max(Math.min((remaining / budget) * 100, 100), 0) : 0;
  const isOverBudget = spending > budget;

  return (
    <>
      <div
        className="flex flex-col items-center gap-3 cursor-pointer group"
        onClick={() => !loading && setShowModal(true)}
      >
        <CircularProgress
          classNames={{
            svg: "w-32 h-32 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.2)] transition-[filter]",
            indicator: isOverBudget ? "stroke-rose-500" : "stroke-emerald-500",
            value: "text-xl font-semibold text-white",
            label: "text-zinc-500 text-xs",
          }}
          showValueLabel={true}
          value={loading ? 0 : percentage}
          valueLabel={loading ? "..." : `$${remaining.toFixed(0)}`}
          label={loading ? "Loading..." : `left of $${budget}`}
        />
        {!loading && (
          <p className="text-xs text-center">
            {isOverBudget ? (
              <span className="text-rose-400">
                Over by ${Math.abs(remaining).toFixed(0)}
              </span>
            ) : (
              <span className="text-zinc-500 group-hover:text-zinc-400 transition-colors">
                Click to view spending
              </span>
            )}
          </p>
        )}
      </div>

      {showModal && (
        <SpendingModal
          onClose={() => setShowModal(false)}
          spending={spending}
          budget={budget}
        />
      )}
    </>
  );
}

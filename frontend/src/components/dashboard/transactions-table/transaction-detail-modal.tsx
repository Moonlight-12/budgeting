"use client";

import { useEffect, useState } from "react";
import { X, Calendar, Tag, DollarSign, ArrowUpDown, Loader2 } from "lucide-react";

interface Transaction {
  _id: string;
  description: string;
  valueInCents: number;
  transactionDate: string | null;
  settleDate: string | null;
  categoryId: string;
  upCategoryId: string | null;
  status: string;
}

interface Category {
  _id: string;
  categoryId: string;
  category: string;
  color: string;
}

interface Props {
  transaction: Transaction;
  onClose: () => void;
  onUpdate: (updated: Transaction) => void;
}

function prettify(id: string) {
  return id
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
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
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtTime(raw: string | null) {
  if (!raw) return "";
  return new Date(raw).toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TransactionDetailModal({
  transaction,
  onClose,
  onUpdate,
}: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    transaction.categoryId
  );
  const [saving, setSaving] = useState(false);
  const [loadingCats, setLoadingCats] = useState(true);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => setCategories(data.categories ?? []))
      .catch(console.error)
      .finally(() => setLoadingCats(false));
  }, []);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  async function handleSave() {
    if (selectedCategoryId === transaction.categoryId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/transaction/${transaction._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: selectedCategoryId }),
      });
      const data = await res.json();
      if (res.ok && data.transaction) {
        onUpdate(data.transaction);
      }
    } catch (e) {
      console.error("Failed to update category:", e);
    } finally {
      setSaving(false);
    }
  }

  const isNegative = transaction.valueInCents < 0;
  const dateRaw = transaction.transactionDate ?? transaction.settleDate;
  const hasChanged = selectedCategoryId !== transaction.categoryId;

  const selectedCat = categories.find(
    (c) => c.categoryId === selectedCategoryId
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <h3 className="text-sm font-semibold text-white">
            Transaction Details
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Amount hero */}
        <div className="px-5 pt-5 pb-4 text-center">
          <p
            className={`text-3xl font-bold tabular-nums ${
              isNegative ? "text-rose-400" : "text-emerald-400"
            }`}
          >
            {fmtAmount(transaction.valueInCents)}
          </p>
          <p className="mt-1 text-sm text-zinc-400 max-w-xs mx-auto truncate">
            {transaction.description}
          </p>
        </div>

        {/* Details grid */}
        <div className="px-5 pb-4 space-y-3">
          {/* Date */}
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-800">
              <Calendar size={14} className="text-zinc-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Date</p>
              <p className="text-white">
                {fmtDate(dateRaw)}
                {dateRaw && (
                  <span className="ml-2 text-zinc-500">{fmtTime(dateRaw)}</span>
                )}
              </p>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-800">
              <ArrowUpDown size={14} className="text-zinc-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Status</p>
              <p className="text-white capitalize">
                {transaction.status ?? "—"}
              </p>
            </div>
          </div>

          {/* Up Bank category */}
          {transaction.upCategoryId && (
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-800">
                <Tag size={14} className="text-zinc-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-500">Up Bank Category</p>
                <p className="text-white">
                  {prettify(transaction.upCategoryId)}
                </p>
              </div>
            </div>
          )}

          {/* Settle date (if different from transaction date) */}
          {transaction.settleDate &&
            transaction.transactionDate &&
            transaction.settleDate !== transaction.transactionDate && (
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-800">
                  <Calendar size={14} className="text-zinc-400" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Settled</p>
                  <p className="text-white">
                    {fmtDate(transaction.settleDate)}
                  </p>
                </div>
              </div>
            )}
        </div>

        {/* Category selector */}
        <div className="mx-5 mb-5 p-4 bg-zinc-800/60 border border-white/5 rounded-xl">
          <label className="block text-xs font-medium text-zinc-400 mb-2">
            <DollarSign size={12} className="inline mr-1 -mt-0.5" />
            Category
          </label>
          {loadingCats ? (
            <div className="flex items-center gap-2 text-sm text-zinc-500 py-1">
              <Loader2 size={14} className="animate-spin" />
              Loading categories...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {selectedCat?.color && (
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: selectedCat.color }}
                />
              )}
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="flex-1 bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/25 transition-colors appearance-none cursor-pointer"
              >
                {categories.map((cat) => (
                  <option key={cat.categoryId} value={cat.categoryId}>
                    {cat.category}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/8">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanged || saving}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-white text-zinc-900 hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

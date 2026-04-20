"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { Search, ChevronLeft, ChevronRight, Plus, X, Upload, CheckCircle, AlertCircle } from "lucide-react";
import TransactionDetailModal from "./transaction-detail-modal";
import { useCurrency } from "@/src/contexts/currency-context";
import { fmt as fmtLib } from "@/src/lib/currency";

interface Transaction {
  _id: string;
  description: string;
  valueInCents: number;
  transactionDate: string | null;
  settleDate: string | null;
  categoryId: string;
  upCategoryId: string | null;
  status: string;
  currency?: string;
}

function prettify(id: string) {
  return id.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

const PAGE_SIZE = 20;

function useFmt() {
  const { preferredCurrency } = useCurrency();
  return (cents: number, txnCurrency = "AUD") =>
    fmtLib(cents, txnCurrency, preferredCurrency, true);
}

function getDate(txn: Transaction) {
  const raw = txn.transactionDate ?? txn.settleDate;
  if (!raw) return "—";
  return new Date(raw).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface Category {
  categoryId: string;
  category: string;
}

function AddTransactionModal({ onClose, onAdded }: { onClose: () => void; onAdded: (txn: Transaction) => void }) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("IDR");
  const [isExpense, setIsExpense] = useState(true);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState("other");
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isIDR = currency === "IDR";

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => setCategories(data.categories ?? []))
      .catch(() => {});
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const parsed = parseFloat(amount);
    if (!description.trim()) { setError("Description is required"); return; }
    if (isNaN(parsed) || parsed <= 0) { setError("Enter a valid amount"); return; }
    // IDR: user types in thousands, multiply by 1000 before sending
    const actualAmount = isIDR ? parsed * 1000 : parsed;
    const signedAmount = isExpense ? -actualAmount : actualAmount;
    setSaving(true);
    try {
      const res = await fetch("/api/transactions/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          amount: signedAmount,
          date,
          categoryId,
          currency,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Failed to add transaction"); return; }
      onAdded(data.transaction);
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <h2 className="text-white font-semibold text-sm">Add Transaction</h2>
          <button onClick={onClose} className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Grocery store"
              className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/25"
            />
          </div>

          {/* Currency selector */}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Currency</label>
            <div className="flex rounded-lg overflow-hidden border border-white/10">
              <button type="button" onClick={() => setCurrency("IDR")} className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${isIDR ? "bg-zinc-600 text-white" : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"}`}>IDR</button>
              <button type="button" onClick={() => setCurrency("AUD")} className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${!isIDR ? "bg-zinc-600 text-white" : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"}`}>AUD</button>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-zinc-400 mb-1 block">
                Amount {isIDR ? <span className="text-zinc-500">(in thousands)</span> : ""}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step={isIDR ? "1" : "0.01"}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={isIDR ? "e.g. 50" : "0.00"}
                  className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 pr-12 text-sm text-white focus:outline-none focus:border-white/25 tabular-nums"
                />
                {isIDR && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 pointer-events-none">,000</span>
                )}
              </div>
              {isIDR && amount && !isNaN(parseFloat(amount)) && (
                <p className="text-xs text-zinc-500 mt-1">
                  = Rp{(parseFloat(amount) * 1000).toLocaleString("id-ID")}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Type</label>
              <div className="flex rounded-lg overflow-hidden border border-white/10">
                <button type="button" onClick={() => setIsExpense(true)} className={`px-3 py-2 text-xs font-medium transition-colors ${isExpense ? "bg-rose-500/20 text-rose-400" : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"}`}>Expense</button>
                <button type="button" onClick={() => setIsExpense(false)} className={`px-3 py-2 text-xs font-medium transition-colors ${!isExpense ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"}`}>Income</button>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/25"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/25"
            >
              <option value="other">Other</option>
              {categories.map((c) => (
                <option key={c.categoryId} value={c.categoryId}>{c.category}</option>
              ))}
            </select>
          </div>
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2 rounded-lg bg-white text-zinc-900 text-sm font-medium hover:bg-zinc-100 disabled:opacity-50 transition-colors"
          >
            {saving ? "Adding..." : "Add Transaction"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ImportCSVModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ saved: number; skipped: number; errors: number } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  async function handleImport() {
    if (!file) return;
    setError("");
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/transactions/import-csv", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Import failed"); return; }
      setResult({ saved: data.saved, skipped: data.skipped, errors: data.errors });
      if (data.saved > 0) onImported();
    } catch {
      setError("Network error");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <h2 className="text-white font-semibold text-sm">Import Bank CSV</h2>
          <button onClick={onClose} className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          {!result ? (
            <>
              <p className="text-xs text-zinc-500">
                Export your transactions from CommBank Internet Banking as a CSV file, then upload it here. Duplicate transactions are automatically skipped.
              </p>
              <div
                className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center cursor-pointer hover:border-white/20 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <Upload size={20} className="mx-auto mb-2 text-zinc-500" />
                {file ? (
                  <p className="text-sm text-white">{file.name}</p>
                ) : (
                  <>
                    <p className="text-sm text-zinc-400">Click to select CSV file</p>
                    <p className="text-xs text-zinc-600 mt-1">CommBank export format</p>
                  </>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
              {error && <p className="text-xs text-rose-400">{error}</p>}
              <button
                onClick={handleImport}
                disabled={!file || importing}
                className="w-full py-2 rounded-lg bg-white text-zinc-900 text-sm font-medium hover:bg-zinc-100 disabled:opacity-50 transition-colors"
              >
                {importing ? "Importing..." : "Import"}
              </button>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle size={16} />
                <span className="text-sm font-medium">Import complete</span>
              </div>
              <div className="bg-zinc-900 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Added</span>
                  <span className="text-emerald-400 font-medium">{result.saved}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Skipped (duplicates)</span>
                  <span className="text-zinc-500">{result.skipped}</span>
                </div>
                {result.errors > 0 && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400 flex items-center gap-1"><AlertCircle size={12} /> Errors</span>
                    <span className="text-rose-400">{result.errors}</span>
                  </div>
                )}
              </div>
              <button onClick={onClose} className="w-full py-2 rounded-lg bg-white text-zinc-900 text-sm font-medium hover:bg-zinc-100 transition-colors">
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TransactionsTable() {
  const now = new Date();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const fmt = useFmt();
  const [page, setPage] = useState(1);
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);

  useEffect(() => {
    fetch("/api/transactions/all")
      .then((r) => r.json())
      .then((data) => setTransactions(data.transactions ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    let result = transactions.filter((t) => {
      const d = new Date(t.transactionDate ?? t.settleDate ?? "");
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.description?.toLowerCase().includes(q) ||
          (t.upCategoryId ?? "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [transactions, search, selectedMonth]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  return (
    <div className="bg-zinc-900 border border-white/8 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between gap-4 border-b border-white/8 flex-wrap">
        <h2 className="text-sm font-semibold text-white">All Transactions</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-white/10 text-zinc-300 text-xs font-medium hover:bg-zinc-700 transition-colors"
          >
            <Upload size={13} />
            Import CSV
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-zinc-900 text-xs font-medium hover:bg-zinc-100 transition-colors"
          >
            <Plus size={13} />
            Add
          </button>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => { setSelectedMonth(e.target.value); setPage(1); }}
          className="bg-zinc-800 border border-white/8 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-white/20"
        />
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="bg-zinc-800 border border-white/8 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/20 w-52"
          />
        </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-5 py-3 text-xs text-zinc-500 font-medium uppercase tracking-wider">
                Date
              </th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-wider">
                Description
              </th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-wider">
                Category
              </th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium uppercase tracking-wider">
                Up Category
              </th>
              <th className="text-right px-5 py-3 text-xs text-zinc-500 font-medium uppercase tracking-wider">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-zinc-500">
                  Loading...
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-zinc-500">
                  {search ? "No matching transactions" : "No transactions found"}
                </td>
              </tr>
            ) : (
              paginated.map((txn) => {
                const isNegative = txn.valueInCents < 0;

                return (
                  <tr
                    key={txn._id}
                    onClick={() => setSelectedTxn(txn)}
                    className="border-b border-white/5 hover:bg-white/3 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3.5 text-zinc-400 whitespace-nowrap">
                      {getDate(txn)}
                    </td>
                    <td className="px-4 py-3.5 text-white max-w-65 truncate">
                      {txn.description}
                    </td>
                    <td className="px-4 py-3.5">
                      {txn.categoryId ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-500/15 text-violet-300 border border-violet-500/20">
                          {prettify(txn.categoryId)}
                        </span>
                      ) : (
                        <span className="text-zinc-600 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {txn.upCategoryId ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300">
                          {prettify(txn.upCategoryId)}
                        </span>
                      ) : (
                        <span className="text-zinc-600 text-xs">—</span>
                      )}
                    </td>
                    <td
                      className={`px-5 py-3.5 text-right font-medium tabular-nums ${
                        isNegative ? "text-rose-400" : "text-emerald-400"
                      }`}
                    >
                      {fmt(txn.valueInCents, txn.currency ?? "AUD")}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!loading && totalPages > 1 && (
        <div className="px-5 py-3 border-t border-white/8 flex items-center justify-between">
          <span className="text-xs text-zinc-500">
            {filtered.length} transactions · page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {selectedTxn && (
        <TransactionDetailModal
          transaction={selectedTxn}
          onClose={() => setSelectedTxn(null)}
          onUpdate={(updated) => {
            setTransactions((prev) =>
              prev.map((t) => (t._id === updated._id ? { ...t, categoryId: updated.categoryId } : t))
            );
            setSelectedTxn(null);
          }}
          onDelete={(id) => {
            setTransactions((prev) => prev.filter((t) => t._id !== id));
            setSelectedTxn(null);
          }}
        />
      )}

      {showAddModal && (
        <AddTransactionModal
          onClose={() => setShowAddModal(false)}
          onAdded={(txn) => {
            setTransactions((prev) => [txn, ...prev]);
            setShowAddModal(false);
          }}
        />
      )}

      {showImportModal && (
        <ImportCSVModal
          onClose={() => setShowImportModal(false)}
          onImported={() => {
            // Reload transactions list after import
            fetch("/api/transactions/all")
              .then((r) => r.json())
              .then((data) => setTransactions(data.transactions ?? []))
              .catch(console.error);
          }}
        />
      )}
    </div>
  );
}

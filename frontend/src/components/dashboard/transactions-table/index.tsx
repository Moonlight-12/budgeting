"use client";

import { useEffect, useState, useMemo } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import TransactionDetailModal from "./transaction-detail-modal";

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

function prettify(id: string) {
  return id.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

const PAGE_SIZE = 20;

function fmt(cents: number) {
  const sign = cents < 0 ? "-" : "+";
  return `${sign}$${(Math.abs(cents) / 100).toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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

export default function TransactionsTable() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);

  useEffect(() => {
    fetch("/api/transactions/all")
      .then((r) => r.json())
      .then((data) => setTransactions(data.transactions ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return transactions;
    const q = search.toLowerCase();
    return transactions.filter(
      (t) =>
        t.description?.toLowerCase().includes(q) ||
        (t.upCategoryId ?? "").toLowerCase().includes(q)
    );
  }, [transactions, search]);

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
                    className="border-b border-white/5 hover:bg-white/[0.03] transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3.5 text-zinc-400 whitespace-nowrap">
                      {getDate(txn)}
                    </td>
                    <td className="px-4 py-3.5 text-white max-w-[260px] truncate">
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
                      {fmt(txn.valueInCents)}
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
        />
      )}
    </div>
  );
}

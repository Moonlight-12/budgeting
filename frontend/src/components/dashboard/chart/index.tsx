"use client";

import { CircularProgress } from "@heroui/progress";
import { useEffect, useState } from "react";

interface Transaction {
  _id: string;
  description: string;
  valueInCents: number;
  transactionDate: string;
}

export default function Chart() {
  const [spending, setSpending] = useState(0);
  const [budget, setBudget] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [spendingRes, budgetRes] = await Promise.all([
          fetch("/api/transactions/calculate-monthly"),
          fetch("/api/budget"),
        ]);

        const spendingData = await spendingRes.json();
        const budgetData = await budgetRes.json();

        setSpending(Math.abs(spendingData.totalAmount || 0));
        setBudget(budgetData.monthlyTarget || 0);
      } catch (error) {
        console.error("Error fetching chart data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleChartClick = async () => {
    setShowModal(true);
    setLoadingTransactions(true);
    try {
      const res = await fetch("/api/transactions/monthly");
      const data = await res.json();
      setTransactions(data.transactions || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const percentage = budget > 0 ? Math.min((spending / budget) * 100, 100) : 0;
  const isOverBudget = spending > budget;

  return (
    <>
      <section className="section-chart rounded-md border">
        <h2 className="sr-only">Spending Overview</h2>

        <div
          onClick={handleChartClick}
          className="cursor-pointer hover:opacity-80 transition-opacity"
        >
          <CircularProgress
            classNames={{
              svg: "w-36 h-36",
              indicator: isOverBudget ? "stroke-red-500" : "stroke-green-500",
              value: "text-2xl font-semibold text-white",
              label: "text-gray-400",
            }}
            showValueLabel={true}
            value={loading ? 0 : percentage}
            valueLabel={loading ? "..." : `$${spending.toFixed(0)}`}
            label={loading ? "Loading..." : `of $${budget} budget`}
          />
        </div>
      </section>

      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-zinc-900 rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">
                Transactions This Month
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-4">
              {loadingTransactions ? (
                <p className="text-gray-400">Loading...</p>
              ) : transactions.length === 0 ? (
                <p className="text-gray-400">No transactions this month</p>
              ) : (
                <ul className="space-y-2">
                  {transactions.map((txn) => (
                    <li
                      key={txn._id}
                      className="flex justify-between items-center py-2 border-b border-zinc-700"
                    >
                      <div>
                        <p className="text-white text-sm">{txn.description}</p>
                        <p className="text-gray-500 text-xs">
                          {new Date(txn.transactionDate).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`font-medium ${
                          txn.valueInCents < 0 ? "text-red-400" : "text-green-400"
                        }`}
                      >
                        ${(Math.abs(txn.valueInCents) / 100).toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

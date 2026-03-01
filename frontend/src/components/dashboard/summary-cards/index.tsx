"use client";

import { useEffect, useState } from "react";
import { TrendingDown, TrendingUp, ArrowLeftRight, Zap } from "lucide-react";

interface SummaryData {
  totalSpending: number;
  totalIncome: number;
  avgTransaction: number;
  biggestExpense: number;
  count: number;
}

function fmt(cents: number) {
  return `$${(Math.abs(cents) / 100).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function SummaryCards() {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const utcOffset = new Date().getTimezoneOffset();
    fetch(`/api/transactions/summary?utcOffset=${utcOffset}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    {
      label: "Total Spent",
      value: loading ? "—" : fmt(data?.totalSpending ?? 0),
      icon: TrendingDown,
      iconColor: "text-rose-400",
      bgColor: "bg-rose-500/10",
      valueColor: "text-rose-400",
    },
    {
      label: "Total Income",
      value: loading ? "—" : fmt(data?.totalIncome ?? 0),
      icon: TrendingUp,
      iconColor: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      valueColor: "text-emerald-400",
    },
    {
      label: "Avg Transaction",
      value: loading ? "—" : fmt(data?.avgTransaction ?? 0),
      icon: ArrowLeftRight,
      iconColor: "text-violet-400",
      bgColor: "bg-violet-500/10",
      valueColor: "text-white",
    },
    {
      label: "Biggest Expense",
      value: loading ? "—" : fmt(data?.biggestExpense ?? 0),
      icon: Zap,
      iconColor: "text-amber-400",
      bgColor: "bg-amber-500/10",
      valueColor: "text-amber-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(({ label, value, icon: Icon, iconColor, bgColor, valueColor }) => (
        <div
          key={label}
          className="bg-zinc-900 border border-white/8 rounded-2xl p-4 flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">
              {label}
            </span>
            <div className={`${bgColor} rounded-lg p-1.5`}>
              <Icon size={14} className={iconColor} />
            </div>
          </div>
          <span className={`text-xl font-semibold ${valueColor}`}>{value}</span>
        </div>
      ))}
    </div>
  );
}

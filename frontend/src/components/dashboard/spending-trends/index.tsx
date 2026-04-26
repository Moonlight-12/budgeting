"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { useCurrency } from "@/src/contexts/currency-context";
import { toDisplayValue, fmtCurrency } from "@/src/lib/currency";

interface TrendPoint {
  label: string;
  spending: number;
  income: number;
}

function CustomTooltip({ active, payload, label, preferredCurrency }: {
  active?: boolean;
  payload?: { value: number; name: string }[];
  label?: string;
  preferredCurrency: string;
}) {
  if (!active || !payload?.length) return null;
  const fmt = (cents: number) => fmtCurrency(toDisplayValue(cents, "AUD", preferredCurrency), preferredCurrency);
  return (
    <div className="bg-zinc-800 border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-zinc-400 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className={p.name === "spending" ? "text-rose-400" : "text-emerald-400"}>
          {p.name === "spending" ? "Spent" : "Income"}: {fmt(p.value)}
        </p>
      ))}
    </div>
  );
}

export default function SpendingTrends() {
  const { preferredCurrency, billingStartDay } = useCurrency();
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const fmt = (cents: number) => fmtCurrency(toDisplayValue(cents, "AUD", preferredCurrency), preferredCurrency);

  useEffect(() => {
    const utcOffset = new Date().getTimezoneOffset();
    fetch(`/api/transactions/spending-trends?utcOffset=${utcOffset}&months=6&billingStartDay=${billingStartDay}`)
      .then((r) => r.json())
      .then((data) => setTrends(data.trends ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const maxSpending = Math.max(...trends.map((t) => t.spending), 1);

  return (
    <div className="bg-zinc-900 border border-white/8 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-white">Spending Trends</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Last 6 billing periods</p>
        </div>
        {!loading && trends.length > 0 && (
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500/70 inline-block" />Spending</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/70 inline-block" />Income</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center text-zinc-500 text-sm">Loading...</div>
      ) : trends.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-zinc-500 text-sm">No data yet</div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={trends} barGap={4} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: "#71717a", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={56}
              tickFormatter={(v) => fmt(v)}
            />
            <Tooltip content={<CustomTooltip preferredCurrency={preferredCurrency} />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <ReferenceLine y={maxSpending} stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
            <Bar dataKey="spending" fill="rgba(244,63,94,0.7)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="income" fill="rgba(16,185,129,0.7)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

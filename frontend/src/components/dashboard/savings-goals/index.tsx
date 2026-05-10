"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Check, X, Loader2 } from "lucide-react";
import { useCurrency } from "@/src/contexts/currency-context";
import { toDisplayValue, fmtCurrency } from "@/src/lib/currency";

interface Goal {
  _id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  color: string;
  deadline?: string;
}

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6", "#f97316", "#06b6d4", "#ef4444"];

function GoalForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<Goal>;
  onSave: (data: Omit<Goal, "_id">) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [target, setTarget] = useState(initial?.targetAmount ? String(initial.targetAmount / 100) : "");
  const [current, setCurrent] = useState(initial?.currentAmount ? String(initial.currentAmount / 100) : "");
  const [color, setColor] = useState(initial?.color ?? "#10b981");
  const [deadline, setDeadline] = useState(initial?.deadline ? initial.deadline.slice(0, 10) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const targetCents = Math.round(parseFloat(target) * 100);
    const currentCents = Math.round(parseFloat(current || "0") * 100);
    if (!name.trim()) { setError("Name is required"); return; }
    if (isNaN(targetCents) || targetCents <= 0) { setError("Enter a valid target amount"); return; }
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        targetAmount: targetCents,
        currentAmount: currentCents,
        color,
        deadline: deadline || undefined,
      });
    } catch {
      setError("Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-zinc-800/60 border border-white/8 rounded-xl p-4 space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          className="flex-1 bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white/25"
          placeholder="Goal name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="flex gap-1.5 flex-wrap">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className="w-7 h-7 rounded-full border-2 transition-all shrink-0"
              style={{ backgroundColor: c, borderColor: color === c ? "white" : "transparent" }}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          className="flex-1 bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white/25"
          placeholder="Target amount ($)"
          type="number"
          min="0"
          step="0.01"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        />
        <input
          className="flex-1 bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white/25"
          placeholder="Saved so far ($)"
          type="number"
          min="0"
          step="0.01"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
        <input
          className="flex-1 bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white/25"
          placeholder="Deadline (optional)"
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-700 transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="px-3 py-1.5 text-xs font-medium bg-white text-zinc-900 rounded-lg hover:bg-zinc-200 disabled:opacity-50 flex items-center gap-1.5 transition-colors">
          {saving && <Loader2 size={12} className="animate-spin" />}
          Save
        </button>
      </div>
    </form>
  );
}

export default function SavingsGoals() {
  const { preferredCurrency } = useCurrency();
  const fmt = (cents: number) => fmtCurrency(toDisplayValue(cents, "AUD", preferredCurrency), preferredCurrency);

  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/savings-goals")
      .then((r) => r.json())
      .then((d) => setGoals(d.goals ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (data: Omit<Goal, "_id">) => {
    const res = await fetch("/api/savings-goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);
    setGoals((prev) => [...prev, json.goal]);
    setShowAdd(false);
  };

  const handleUpdate = async (id: string, data: Omit<Goal, "_id">) => {
    const res = await fetch(`/api/savings-goals/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);
    setGoals((prev) => prev.map((g) => (g._id === id ? json.goal : g)));
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await fetch(`/api/savings-goals/${id}`, { method: "DELETE" });
      setGoals((prev) => prev.filter((g) => g._id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-zinc-900 border border-white/8 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-white">Savings Goals</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Track progress toward your targets</p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setEditingId(null); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 border border-white/10 rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <Plus size={13} /> Add goal
        </button>
      </div>

      {showAdd && (
        <div className="mb-3">
          <GoalForm onSave={handleCreate} onCancel={() => setShowAdd(false)} />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8 text-zinc-500 text-sm">
          <Loader2 size={16} className="animate-spin mr-2" /> Loading...
        </div>
      ) : goals.length === 0 && !showAdd ? (
        <p className="text-center text-zinc-500 text-sm py-8">No goals yet. Add one to get started.</p>
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => {
            const pct = goal.targetAmount > 0 ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) : 0;
            const done = goal.currentAmount >= goal.targetAmount;

            if (editingId === goal._id) {
              return (
                <GoalForm
                  key={goal._id}
                  initial={goal}
                  onSave={(data) => handleUpdate(goal._id, data)}
                  onCancel={() => setEditingId(null)}
                />
              );
            }

            return (
              <div key={goal._id} className="bg-zinc-800/40 border border-white/5 rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: goal.color }} />
                    <span className="text-sm font-medium text-white">{goal.name}</span>
                    {done && (
                      <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                        <Check size={10} /> Done
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setEditingId(goal._id); setShowAdd(false); }}
                      className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(goal._id)}
                      disabled={deletingId === goal._id}
                      className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-zinc-700 rounded-lg transition-colors"
                    >
                      {deletingId === goal._id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    </button>
                  </div>
                </div>

                <div className="w-full h-2 bg-zinc-700 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: goal.color }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>
                    <span className="text-white font-medium">{fmt(goal.currentAmount)}</span>
                    {" "}/{" "}{fmt(goal.targetAmount)}
                  </span>
                  <div className="flex items-center gap-3">
                    {goal.deadline && (
                      <span>by {new Date(goal.deadline).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}</span>
                    )}
                    <span className="tabular-nums">{Math.round(pct)}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

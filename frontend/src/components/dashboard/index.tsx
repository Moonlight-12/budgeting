"use client";

import { useState, useEffect } from "react";
import { Target, Settings2, Link2, Link2Off, LogOut, User } from "lucide-react";
import Link from "next/link";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import dynamic from "next/dynamic";
const Chart = dynamic(() => import("./chart"), { ssr: false });
const SpendingTrends = dynamic(() => import("./spending-trends"), { ssr: false });
import SummaryCards from "./summary-cards";
import CategoriesTable from "./categories-table";
import TransactionsTable from "./transactions-table";
import CategoryManager from "./category-manager";
import SavingsGoals from "./savings-goals";

export default function Dashboard() {
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [upTokenError, setUpTokenError] = useState<string | null>(null);
  const [showBudgetEdit, setShowBudgetEdit] = useState(false);
  const [budgetValue, setBudgetValue] = useState("");
  const [updating, setUpdating] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showUpTokenEdit, setShowUpTokenEdit] = useState(false);
  const [upTokenValue, setUpTokenValue] = useState("");
  const [upTokenMasked, setUpTokenMasked] = useState<string | null>(null);
  const [savingUpToken, setSavingUpToken] = useState(false);

  useEffect(() => {
    fetch("/api/users/up-token")
      .then((r) => r.json())
      .then((data) => { if (data.hasToken) setUpTokenMasked(data.maskedToken); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    handleSync(false, true);
  }, []);

  const handleSync = async (full = false, silent = false) => {
    if (!silent) setSyncResult(null);
    try {
      const url = full ? "/api/transactions/sync?full=true" : "/api/transactions/sync";
      const response = await fetch(url, { method: "POST" });
      const data = await response.json();
      if (response.ok && !silent) {
        const parts = [`${data.saved} new`, `${data.skipped} skipped`];
        if (data.recategorized) parts.push(`${data.recategorized} recategorized`);
        setSyncResult(parts.join(" · "));
      }
    } catch {
      if (!silent) setSyncResult("Network error");
    }
  };

  const handleSaveUpToken = async () => {
    if (!upTokenValue.trim()) return;
    setSavingUpToken(true);
    setUpTokenError(null);
    try {
      const response = await fetch("/api/users/up-token", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upApiKey: upTokenValue.trim() }),
      });
      const data = await response.json();
      if (response.ok) {
        setUpTokenMasked(data.maskedToken);
        setUpTokenValue("");
        setShowUpTokenEdit(false);
      } else {
        setUpTokenError(data.message || "Invalid token");
      }
    } catch (error) {
      console.error("Error saving Up token:", error);
      setUpTokenError("Network error");
    } finally {
      setSavingUpToken(false);
    }
  };

  const handleSignout = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    window.location.href = "/auth/signin";
  };

  const handleUpdateBudget = async () => {
    const value = parseFloat(budgetValue);
    if (isNaN(value) || value < 0) return;

    setUpdating(true);
    try {
      const response = await fetch("/api/budget", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthlyTarget: value }),
      });

      if (response.ok) {
        setShowBudgetEdit(false);
        setBudgetValue("");
        window.location.reload();
      }
    } catch (error) {
      console.error("Error updating budget:", error);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <main className="min-h-screen p-5 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Track your spending this period</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {showBudgetEdit ? (
            <>
              <Input
                type="number"
                placeholder="Monthly budget"
                value={budgetValue}
                onChange={(e) => setBudgetValue(e.target.value)}
                className="w-36 text-white bg-zinc-900 border-white/10"
              />
              <Button onClick={handleUpdateBudget} disabled={updating} size="sm">
                {updating ? "Saving..." : "Save"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-zinc-400 hover:text-white"
                onClick={() => {
                  setShowBudgetEdit(false);
                  setBudgetValue("");
                }}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="text-white border-white/10 bg-transparent hover:bg-zinc-800"
              onClick={() => setShowBudgetEdit(true)}
            >
              <Target size={14} className="mr-1.5" />
              Set Budget
            </Button>
          )}

          {showUpTokenEdit ? (
            <>
              <Input
                type="password"
                placeholder="up:yeah:..."
                value={upTokenValue}
                onChange={(e) => { setUpTokenValue(e.target.value); setUpTokenError(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveUpToken(); if (e.key === "Escape") { setShowUpTokenEdit(false); setUpTokenError(null); } }}
                className={`w-52 text-white bg-zinc-900 font-mono text-xs ${upTokenError ? "border-red-500" : "border-white/10"}`}
              />
              {upTokenError && <span className="text-xs text-red-400">{upTokenError}</span>}
              <Button onClick={handleSaveUpToken} disabled={savingUpToken} size="sm">
                {savingUpToken ? "Validating..." : "Save"}
              </Button>
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white" onClick={() => { setShowUpTokenEdit(false); setUpTokenValue(""); setUpTokenError(null); }}>
                Cancel
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className={upTokenMasked ? "text-emerald-400 border-emerald-400/30 bg-transparent hover:bg-zinc-800" : "text-amber-400 border-amber-400/30 bg-transparent hover:bg-zinc-800"}
              onClick={() => setShowUpTokenEdit(true)}
            >
              {upTokenMasked ? <Link2 size={14} className="mr-1.5" /> : <Link2Off size={14} className="mr-1.5" />}
              {upTokenMasked ? "Up Connected" : "Connect Up"}
            </Button>
          )}


          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowCategoryManager(true)}
            className="text-zinc-300 border-white/10 bg-transparent hover:bg-zinc-800"
          >
            <Settings2 size={14} className="mr-1.5" />
            Categories
          </Button>

          <Link href="/profile">
            <Button size="sm" variant="ghost" className="text-zinc-400 hover:text-white hover:bg-zinc-800">
              <User size={14} className="mr-1.5" />
              Profile
            </Button>
          </Link>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleSignout}
            className="text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <LogOut size={14} className="mr-1.5" />
            Sign out
          </Button>

          {syncResult && (
            <span className="text-xs text-zinc-400 bg-zinc-800 px-2.5 py-1.5 rounded-lg">
              {syncResult}
            </span>
          )}
        </div>
      </div>

      {/* Top row: circular budget gauge + summary stat cards */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="bg-zinc-900 border border-white/8 rounded-2xl p-6 flex items-center justify-center lg:w-56 shrink-0">
          <Chart />
        </div>
        <div className="flex-1">
          <SummaryCards />
        </div>
      </div>

      {/* Categories spending table */}
      <CategoriesTable />

      {/* Spending trends + savings goals side by side on large screens */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <SpendingTrends />
        </div>
        <div className="flex-1">
          <SavingsGoals />
        </div>
      </div>

      {/* All transactions table */}
      <TransactionsTable />

      {showCategoryManager && (
        <CategoryManager onClose={() => setShowCategoryManager(false)} />
      )}

    </main>
  );
}

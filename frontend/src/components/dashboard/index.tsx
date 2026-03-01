"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Target, Tags, Settings2, Link2, Link2Off, LogOut } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import dynamic from "next/dynamic";
const Chart = dynamic(() => import("./chart"), { ssr: false });
import SummaryCards from "./summary-cards";
import CategoriesTable from "./categories-table";
import TransactionsTable from "./transactions-table";
import CategoryManager from "./category-manager";

export default function Dashboard() {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [recategorizing, setRecategorizing] = useState(false);
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

  const handleSync = async (full = false) => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const url = full ? "/api/transactions/sync?full=true" : "/api/transactions/sync";
      const response = await fetch(url, { method: "POST" });
      const data = await response.json();
      if (response.ok) {
        const parts = [`${data.saved} new`, `${data.skipped} skipped`];
        if (data.recategorized) parts.push(`${data.recategorized} recategorized`);
        setSyncResult(parts.join(" · "));
        window.location.reload();
      } else {
        setSyncResult(data.message || "Sync failed");
      }
    } catch {
      setSyncResult("Network error");
    } finally {
      setSyncing(false);
    }
  };

  const handleRecategorize = async () => {
    setRecategorizing(true);
    setSyncResult(null);
    try {
      const response = await fetch("/api/transactions/recategorize", { method: "POST" });
      const data = await response.json();
      if (response.ok) {
        setSyncResult(`${data.updated} of ${data.total} recategorized`);
        window.location.reload();
      } else {
        setSyncResult(data.message || "Recategorize failed");
      }
    } catch {
      setSyncResult("Network error");
    } finally {
      setRecategorizing(false);
    }
  };

  const handleSaveUpToken = async () => {
    if (!upTokenValue.trim()) return;
    setSavingUpToken(true);
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
      }
    } catch (error) {
      console.error("Error saving Up token:", error);
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
                onChange={(e) => setUpTokenValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveUpToken(); if (e.key === "Escape") setShowUpTokenEdit(false); }}
                className="w-52 text-white bg-zinc-900 border-white/10 font-mono text-xs"
              />
              <Button onClick={handleSaveUpToken} disabled={savingUpToken} size="sm">
                {savingUpToken ? "Saving..." : "Save"}
              </Button>
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white" onClick={() => { setShowUpTokenEdit(false); setUpTokenValue(""); }}>
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
            onClick={() => handleSync(false)}
            disabled={syncing}
            className="bg-white text-zinc-900 hover:bg-zinc-100"
          >
            <RefreshCw size={14} className={`mr-1.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync"}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => handleSync(true)}
            disabled={syncing}
            className="text-zinc-300 border-white/10 bg-transparent hover:bg-zinc-800"
          >
            <RefreshCw size={14} className="mr-1.5" />
            Full Sync
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleRecategorize}
            disabled={recategorizing}
            className="text-zinc-300 border-white/10 bg-transparent hover:bg-zinc-800"
          >
            <Tags size={14} className="mr-1.5" />
            {recategorizing ? "Recategorizing..." : "Recategorize"}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowCategoryManager(true)}
            className="text-zinc-300 border-white/10 bg-transparent hover:bg-zinc-800"
          >
            <Settings2 size={14} className="mr-1.5" />
            Categories
          </Button>

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

      {/* All transactions table */}
      <TransactionsTable />

      {showCategoryManager && (
        <CategoryManager onClose={() => setShowCategoryManager(false)} />
      )}
    </main>
  );
}

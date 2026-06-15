"use client";

import { useState, useEffect, useRef } from "react";
import { Target, Settings2, Link2, Link2Off, LogOut, User, RefreshCw, X, ChevronDown, Menu, AlertTriangle } from "lucide-react";
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
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [upTokenError, setUpTokenError] = useState<string | null>(null);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetValue, setBudgetValue] = useState("");
  const [updating, setUpdating] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showUpTokenModal, setShowUpTokenModal] = useState(false);
  const [upTokenValue, setUpTokenValue] = useState("");
  const [upTokenMasked, setUpTokenMasked] = useState<string | null>(null);
  const [savingUpToken, setSavingUpToken] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/users/up-token")
      .then((r) => r.json())
      .then((data) => { if (data.hasToken) setUpTokenMasked(data.maskedToken); })
      .catch(() => {});
  }, []);

  useEffect(() => { handleSync(false, true); }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node))
        setUserMenuOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!showBudgetModal) return;
    fetch("/api/budget")
      .then((r) => r.json())
      .then((data) => { if (data.monthlyTarget != null) setBudgetValue(String(data.monthlyTarget)); })
      .catch(() => {});
  }, [showBudgetModal]);

  const handleSync = async (full = false, silent = false) => {
    if (!silent) { setSyncing(true); setSyncResult(null); }
    try {
      const url = full ? "/api/transactions/sync?full=true" : "/api/transactions/sync";
      const response = await fetch(url, { method: "POST" });
      const data = await response.json();
      if (response.ok) {
        setLastSyncedAt(new Date().toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" }));
        if (!silent) {
          const parts = [`${data.saved} new`, `${data.skipped} skipped`];
          if (data.recategorized) parts.push(`${data.recategorized} recategorized`);
          setSyncResult(parts.join(" · "));
        }
      }
    } catch {
      if (!silent) setSyncResult("Network error");
    } finally {
      if (!silent) setSyncing(false);
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
        setShowUpTokenModal(false);
      } else {
        setUpTokenError(data.message || "Invalid token");
      }
    } catch {
      setUpTokenError("Network error");
    } finally {
      setSavingUpToken(false);
    }
  };

  const handleSignout = async () => {
    setShowSignOutConfirm(false);
    await fetch("/api/auth/signout", { method: "POST" });
    window.location.href = "/auth/signin";
  };

  const openSignOutConfirm = () => {
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
    setShowSignOutConfirm(true);
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
        setShowBudgetModal(false);
        setBudgetValue("");
        window.location.reload();
      }
    } catch {
      console.error("Error updating budget");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <main className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Dashboard</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            {lastSyncedAt ? `Synced at ${lastSyncedAt}` : "Track your spending this period"}
          </p>
        </div>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => handleSync(false, false)} disabled={syncing} className="text-zinc-400 hover:text-white hover:bg-zinc-800">
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
            <span className="ml-1.5">Sync</span>
          </Button>
          <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white hover:bg-zinc-800" onClick={() => setShowBudgetModal(true)}>
            <Target size={14} /><span className="ml-1.5">Budget</span>
          </Button>
          <Button variant="ghost" size="sm" className={upTokenMasked ? "text-emerald-400 hover:bg-zinc-800" : "text-amber-400 hover:bg-zinc-800"} onClick={() => setShowUpTokenModal(true)}>
            {upTokenMasked ? <Link2 size={14} /> : <Link2Off size={14} />}
            <span className="ml-1.5">{upTokenMasked ? "Up" : "Connect Up"}</span>
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowCategoryManager(true)} className="text-zinc-400 hover:text-white hover:bg-zinc-800">
            <Settings2 size={14} /><span className="ml-1.5">Categories</span>
          </Button>
          <div className="relative" ref={userMenuRef}>
            <Button size="sm" variant="ghost" className="text-zinc-400 hover:text-white hover:bg-zinc-800" onClick={() => setUserMenuOpen((o) => !o)}>
              <User size={14} /><ChevronDown size={11} className="ml-1" />
            </Button>
            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-40 bg-zinc-800 border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden py-1">
                <Link href="/profile" onClick={() => setUserMenuOpen(false)}>
                  <button className="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors flex items-center gap-2.5">
                    <User size={13} /> Profile
                  </button>
                </Link>
                <button onClick={openSignOutConfirm} className="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors flex items-center gap-2.5">
                  <LogOut size={13} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu size={20} />
        </button>
      </div>

      {syncResult && (
        <div className="text-xs text-zinc-400 bg-zinc-800/60 border border-white/5 px-3 py-2 rounded-lg inline-flex items-center gap-2">
          {syncResult}
          <button onClick={() => setSyncResult(null)} className="text-zinc-600 hover:text-zinc-400 transition-colors">
            <X size={11} />
          </button>
        </div>
      )}

      {/* Top row */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="bg-zinc-900 border border-white/8 rounded-2xl p-6 flex items-center justify-center lg:w-56 shrink-0">
          <Chart />
        </div>
        <div className="flex-1">
          <SummaryCards />
        </div>
      </div>

      <CategoriesTable />

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1"><SpendingTrends /></div>
        <div className="flex-1"><SavingsGoals /></div>
      </div>

      <TransactionsTable />

      {showCategoryManager && (
        <CategoryManager onClose={() => setShowCategoryManager(false)} />
      )}

      {/* Budget modal */}
      {showBudgetModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setShowBudgetModal(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-zinc-900 border border-white/10 rounded-2xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Set Monthly Budget</h3>
              <button onClick={() => setShowBudgetModal(false)} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
                <X size={16} />
              </button>
            </div>
            <Input
              type="number"
              placeholder="Monthly budget amount"
              value={budgetValue}
              onChange={(e) => setBudgetValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleUpdateBudget(); if (e.key === "Escape") setShowBudgetModal(false); }}
              className="text-white bg-zinc-800 border-white/10"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white" onClick={() => setShowBudgetModal(false)}>Cancel</Button>
              <Button size="sm" onClick={handleUpdateBudget} disabled={updating}>{updating ? "Saving..." : "Save"}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile menu bottom sheet */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 sm:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="absolute bottom-0 left-0 right-0 bg-zinc-900 border-t border-white/10 rounded-t-2xl p-4 space-y-1" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-4" />
            <button onClick={() => { handleSync(false, false); setMobileMenuOpen(false); }} disabled={syncing} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">
              <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
              <span className="text-sm font-medium">Sync transactions</span>
            </button>
            <button onClick={() => { setShowBudgetModal(true); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">
              <Target size={16} />
              <span className="text-sm font-medium">Set budget</span>
            </button>
            <button onClick={() => { setShowUpTokenModal(true); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-800 transition-colors ${upTokenMasked ? "text-emerald-400" : "text-amber-400"}`}>
              {upTokenMasked ? <Link2 size={16} /> : <Link2Off size={16} />}
              <span className="text-sm font-medium">{upTokenMasked ? "Up Bank connected" : "Connect Up Bank"}</span>
            </button>
            <button onClick={() => { setShowCategoryManager(true); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">
              <Settings2 size={16} />
              <span className="text-sm font-medium">Manage categories</span>
            </button>
            <div className="h-px bg-white/8 my-1" />
            <Link href="/profile" onClick={() => setMobileMenuOpen(false)}>
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">
                <User size={16} />
                <span className="text-sm font-medium">Profile</span>
              </button>
            </Link>
            <button onClick={openSignOutConfirm} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">
              <LogOut size={16} />
              <span className="text-sm font-medium">Sign out</span>
            </button>
          </div>
        </div>
      )}

      {/* Sign-out confirmation */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowSignOutConfirm(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-xs bg-zinc-900 border border-white/10 rounded-2xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-500/10">
                <AlertTriangle size={16} className="text-rose-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Sign out?</h3>
                <p className="text-xs text-zinc-500 mt-0.5">You&apos;ll need to sign in again to access your data.</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white" onClick={() => setShowSignOutConfirm(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSignout} className="bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border-0">Sign out</Button>
            </div>
          </div>
        </div>
      )}

      {/* Up token modal */}
      {showUpTokenModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => { setShowUpTokenModal(false); setUpTokenError(null); }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-zinc-900 border border-white/10 rounded-2xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Up Bank API Token</h3>
              <button onClick={() => { setShowUpTokenModal(false); setUpTokenError(null); }} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
                <X size={16} />
              </button>
            </div>
            {upTokenMasked && (
              <p className="text-xs text-emerald-400 bg-emerald-400/10 px-3 py-2 rounded-lg">Connected: {upTokenMasked}</p>
            )}
            <Input
              type="password"
              placeholder="up:yeah:..."
              value={upTokenValue}
              onChange={(e) => { setUpTokenValue(e.target.value); setUpTokenError(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleSaveUpToken(); if (e.key === "Escape") { setShowUpTokenModal(false); setUpTokenError(null); } }}
              className={`font-mono text-xs text-white bg-zinc-800 ${upTokenError ? "border-red-500" : "border-white/10"}`}
              autoFocus
            />
            {upTokenError && <p className="text-xs text-red-400">{upTokenError}</p>}
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white" onClick={() => { setShowUpTokenModal(false); setUpTokenError(null); }}>Cancel</Button>
              <Button size="sm" onClick={handleSaveUpToken} disabled={savingUpToken}>{savingUpToken ? "Validating..." : "Save"}</Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

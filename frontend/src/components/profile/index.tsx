"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, Mail, Chrome, CheckCircle, Loader2, Lock, Eye, EyeOff, Coins, CalendarDays } from "lucide-react";
import { useCurrency } from "@/src/contexts/currency-context";
import Link from "next/link";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (res: { credential: string }) => void }) => void;
          renderButton: (el: HTMLElement, opts: object) => void;
        };
      };
    };
  }
}

interface UserProfile {
  _id: string;
  username: string;
  email?: string;
  googleId?: string;
}

type ModalStep = "input" | "otp";

export default function ProfilePage() {
  const { preferredCurrency, setCurrency, billingStartDay, setBillingStartDay } = useCurrency();
  const [billingDayInput, setBillingDayInput] = useState<string>("");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLinkModal, setShowLinkModal] = useState(false);

  // Modal state
  const [step, setStep] = useState<ModalStep>("input");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  useEffect(() => {
    fetch("/api/users/profile")
      .then((r) => r.json())
      .then((data) => setUser(data.user ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleGoogleCredential = useCallback(async (response: { credential: string }) => {
    setGoogleLoading(true);
    setError("");
    try {
      const res = await fetch("/api/users/link-google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser((prev) => prev ? { ...prev, googleId: "linked", email: data.email ?? prev.email } : prev);
        setShowLinkModal(false);
      } else {
        setError(data.message || "Failed to link Google account");
      }
    } catch {
      setError("Network error");
    } finally {
      setGoogleLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!showLinkModal) return;
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const init = () => {
      window.google?.accounts.id.initialize({ client_id: clientId, callback: handleGoogleCredential });
      const btn = document.getElementById("google-link-btn");
      if (btn) {
        window.google?.accounts.id.renderButton(btn, { theme: "outline", size: "large", width: btn.offsetWidth || 320, text: "signin_with" });
      }
    };

    if (window.google) { init(); return; }
    const existing = document.getElementById("google-gsi");
    if (existing) { existing.addEventListener("load", init); return; }
    const script = document.createElement("script");
    script.id = "google-gsi";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = init;
    document.body.appendChild(script);
  }, [showLinkModal, handleGoogleCredential]);

  useEffect(() => {
    if (showLinkModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [showLinkModal]);

  const handleSendOtp = async () => {
    if (!email.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/users/link-email/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setStep("otp");
      } else {
        setError(data.message || "Failed to send OTP");
      }
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/users/link-email/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), otp: otp.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser((prev) => prev ? { ...prev, email: data.email } : prev);
        setShowLinkModal(false);
      } else {
        setError(data.message || "Invalid OTP");
      }
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePassword = async () => {
    setPwError("");
    setPwSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwError("All fields are required");
      return;
    }
    if (newPassword.length < 6) {
      setPwError("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("New passwords do not match");
      return;
    }

    setPwSubmitting(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setPwSuccess("Password changed. Signing out…");
        await fetch("/api/auth/signout", { method: "POST" });
        window.location.href = "/auth/signin";
        return;
      } else {
        setPwError(data.error || data.message || "Failed to change password");
      }
    } catch {
      setPwError("Network error");
    } finally {
      setPwSubmitting(false);
    }
  };

  const openModal = () => {
    setStep("input");
    setEmail("");
    setOtp("");
    setError("");
    setShowLinkModal(true);
  };

  const showGoogle = !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <main className="min-h-screen p-5 lg:p-8 max-w-lg mx-auto">
      <div className="mb-6">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors">
          <ArrowLeft size={14} />
          Dashboard
        </Link>
      </div>

      <h1 className="text-xl font-semibold text-white mb-6">Profile</h1>

      <div className="bg-zinc-900 border border-white/8 rounded-2xl divide-y divide-white/5">
        {/* Username */}
        <div className="px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-500 mb-0.5">Username</p>
            <p className="text-white text-sm font-medium">{user?.username}</p>
          </div>
        </div>

        {/* Email */}
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
              <Mail size={14} className="text-zinc-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">Email</p>
              {user?.email ? (
                <p className="text-white text-sm flex items-center gap-1.5">
                  {user.email}
                  <CheckCircle size={13} className="text-emerald-400" />
                </p>
              ) : (
                <p className="text-zinc-500 text-sm">Not linked</p>
              )}
            </div>
          </div>
          {!user?.email && (
            <button
              onClick={openModal}
              className="text-xs text-zinc-400 hover:text-white border border-white/10 hover:border-white/20 rounded-lg px-3 py-1.5 transition-colors"
            >
              Link
            </button>
          )}
        </div>

        {/* Google */}
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
              <Chrome size={14} className="text-zinc-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">Google</p>
              {user?.googleId ? (
                <p className="text-white text-sm flex items-center gap-1.5">
                  Connected
                  <CheckCircle size={13} className="text-emerald-400" />
                </p>
              ) : (
                <p className="text-zinc-500 text-sm">Not linked</p>
              )}
            </div>
          </div>
          {!user?.googleId && (
            <button
              onClick={openModal}
              className="text-xs text-zinc-400 hover:text-white border border-white/10 hover:border-white/20 rounded-lg px-3 py-1.5 transition-colors"
            >
              Link
            </button>
          )}
        </div>
      </div>

      {/* Display Currency */}
      <h2 className="text-base font-semibold text-white mt-8 mb-4 flex items-center gap-2">
        <Coins size={16} className="text-zinc-400" />
        Display Currency
      </h2>
      <div className="bg-zinc-900 border border-white/8 rounded-2xl px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-white font-medium">
            {preferredCurrency === "IDR" ? "Indonesian Rupiah (IDR)" : "Australian Dollar (AUD)"}
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">1 AUD = 11,000 IDR</p>
        </div>
        <div className="flex rounded-lg overflow-hidden border border-white/10">
          <button
            onClick={() => setCurrency("AUD")}
            className={`px-4 py-1.5 text-xs font-medium transition-colors ${preferredCurrency === "AUD" ? "bg-zinc-600 text-white" : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"}`}
          >
            AUD
          </button>
          <button
            onClick={() => setCurrency("IDR")}
            className={`px-4 py-1.5 text-xs font-medium transition-colors ${preferredCurrency === "IDR" ? "bg-zinc-600 text-white" : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"}`}
          >
            IDR
          </button>
        </div>
      </div>

      {/* Billing Period */}
      <h2 className="text-base font-semibold text-white mt-8 mb-4 flex items-center gap-2">
        <CalendarDays size={16} className="text-zinc-400" />
        Billing Period
      </h2>
      <div className="bg-zinc-900 border border-white/8 rounded-2xl px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-white font-medium">Period start day</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              {billingStartDay === 1
                ? "1st → last day of month"
                : `${billingStartDay}${["st","nd","rd"][billingStartDay - 1] ?? "th"} → ${billingStartDay - 1}${["st","nd","rd"][billingStartDay - 2] ?? "th"} of next month`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { const d = Math.max(1, billingStartDay - 1); setBillingStartDay(d); }}
              className="w-7 h-7 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors text-sm font-medium flex items-center justify-center"
            >
              −
            </button>
            <input
              type="number"
              min={1}
              max={28}
              value={billingDayInput !== "" ? billingDayInput : billingStartDay}
              onChange={(e) => setBillingDayInput(e.target.value)}
              onBlur={() => {
                const d = parseInt(billingDayInput);
                if (!isNaN(d) && d >= 1 && d <= 28) setBillingStartDay(d);
                setBillingDayInput("");
              }}
              className="w-12 text-center bg-zinc-800 border border-white/10 rounded-lg py-1.5 text-sm text-white focus:outline-none focus:border-white/25"
            />
            <button
              onClick={() => { const d = Math.min(28, billingStartDay + 1); setBillingStartDay(d); }}
              className="w-7 h-7 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors text-sm font-medium flex items-center justify-center"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <h2 className="text-base font-semibold text-white mt-8 mb-4 flex items-center gap-2">
        <Lock size={16} className="text-zinc-400" />
        Change Password
      </h2>

      <div className="bg-zinc-900 border border-white/8 rounded-2xl p-5 space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-400">Current password</label>
          <div className="relative">
            <input
              type={showCurrentPw ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => { setCurrentPassword(e.target.value); setPwError(""); setPwSuccess(""); }}
              placeholder="Enter current password"
              className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 pr-10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/25"
            />
            <button
              type="button"
              onClick={() => setShowCurrentPw(!showCurrentPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              {showCurrentPw ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-zinc-400">New password</label>
          <div className="relative">
            <input
              type={showNewPw ? "text" : "password"}
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setPwError(""); setPwSuccess(""); }}
              placeholder="Enter new password"
              className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 pr-10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/25"
            />
            <button
              type="button"
              onClick={() => setShowNewPw(!showNewPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              {showNewPw ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-zinc-400">Confirm new password</label>
          <div className="relative">
            <input
              type={showConfirmPw ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setPwError(""); setPwSuccess(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleChangePassword(); }}
              placeholder="Re-enter new password"
              className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 pr-10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/25"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPw(!showConfirmPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              {showConfirmPw ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        {pwError && <p className="text-xs text-rose-400">{pwError}</p>}
        {pwSuccess && <p className="text-xs text-emerald-400">{pwSuccess}</p>}

        <button
          onClick={handleChangePassword}
          disabled={!currentPassword || !newPassword || !confirmPassword || pwSubmitting}
          className="w-full py-2 rounded-lg bg-white text-zinc-900 text-sm font-medium hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {pwSubmitting && <Loader2 size={14} className="animate-spin" />}
          Update password
        </button>
      </div>

      {/* Link modal */}
      {showLinkModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowLinkModal(false)}
        >
          <div
            className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-sm p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-white font-semibold">Link account</h2>

            {step === "input" ? (
              <>
                <div className="space-y-2">
                  <label className="text-xs text-zinc-400">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSendOtp(); }}
                    placeholder="you@example.com"
                    className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/25"
                  />
                </div>

                {error && <p className="text-xs text-rose-400">{error}</p>}

                <button
                  onClick={handleSendOtp}
                  disabled={!email.trim() || submitting}
                  className="w-full py-2 rounded-lg bg-white text-zinc-900 text-sm font-medium hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  Send verification code
                </button>
              </>
            ) : (
              <>
                <p className="text-xs text-zinc-400">Enter the 6-digit code sent to <span className="text-white">{email}</span></p>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    onKeyDown={(e) => { if (e.key === "Enter") handleVerifyOtp(); }}
                    placeholder="000000"
                    maxLength={6}
                    className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/25 tracking-widest text-center font-mono"
                  />
                </div>

                {error && <p className="text-xs text-rose-400">{error}</p>}

                <div className="flex gap-2">
                  <button
                    onClick={() => { setStep("input"); setOtp(""); setError(""); }}
                    className="flex-1 py-2 rounded-lg border border-white/10 text-zinc-400 text-sm hover:text-white hover:border-white/20 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleVerifyOtp}
                    disabled={otp.length !== 6 || submitting}
                    className="flex-1 py-2 rounded-lg bg-white text-zinc-900 text-sm font-medium hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {submitting && <Loader2 size={14} className="animate-spin" />}
                    Verify
                  </button>
                </div>
              </>
            )}

            {showGoogle && step === "input" && (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-white/8" />
                  <span className="text-xs text-zinc-500">or</span>
                  <div className="flex-1 h-px bg-white/8" />
                </div>
                {googleLoading ? (
                  <div className="w-full h-10 flex items-center justify-center text-sm text-zinc-500">
                    <Loader2 size={14} className="animate-spin mr-2" /> Linking…
                  </div>
                ) : (
                  <div id="google-link-btn" className="w-full flex justify-center" />
                )}
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

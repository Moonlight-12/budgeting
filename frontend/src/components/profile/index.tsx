"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, Mail, Chrome, CheckCircle, Loader2 } from "lucide-react";
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

"use client";

import { useEffect, useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/src/components/ui/field";
import { Input } from "@/src/components/ui/input";
import Link from "next/link";

type Step = "details" | "otp";

function useCountdown(target: Date | null) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!target) { setSecondsLeft(0); return; }
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((target.getTime() - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [target]);

  return secondsLeft;
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function SignupForm() {
  const [step, setStep] = useState<Step>("details");

  // Step 1 fields
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  // Step 2 fields
  const [otp, setOtp] = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null);
  const [resendAvailableAt, setResendAvailableAt] = useState<Date | null>(null);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const lockSecondsLeft = useCountdown(lockedUntil);
  const resendSecondsLeft = useCountdown(resendAvailableAt);

  const handleSendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setResendAvailableAt(new Date(data.resendAvailableAt));
        setAttemptsLeft(null);
        setLockedUntil(null);
        setOtp("");
        setStep("otp");
      } else if (res.status === 429) {
        setResendAvailableAt(new Date(Date.now() + data.retryAfterSeconds * 1000));
        setError(data.error || "Please wait before requesting a new code");
      } else {
        setError(data.error || "Failed to send verification code");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (res.ok) {
        window.location.href = "/dashboard";
      } else if (res.status === 429) {
        setLockedUntil(new Date(data.lockedUntil));
        setAttemptsLeft(0);
        setError(data.error || "Too many attempts");
      } else {
        if (data.attemptsLeft !== undefined) setAttemptsLeft(data.attemptsLeft);
        setError(data.error || "Invalid code");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendSecondsLeft > 0) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setResendAvailableAt(new Date(data.resendAvailableAt));
        setLockedUntil(null);
        setAttemptsLeft(null);
        setOtp("");
      } else if (res.status === 429) {
        setResendAvailableAt(new Date(Date.now() + data.retryAfterSeconds * 1000));
        setError(data.error || "Please wait before requesting a new code");
      } else {
        setError(data.error || "Failed to resend code");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (step === "otp") {
    const isLocked = lockSecondsLeft > 0;
    return (
      <form className="py-4" onSubmit={handleVerifyOtp}>
        <h2 className="text-lg font-semibold text-zinc-900 mb-1">Check your email</h2>
        <p className="text-sm text-zinc-500 mb-4">
          We sent a 6-digit code to <span className="font-medium text-zinc-700">{email}</span>
        </p>

        <FieldGroup className="mb-4">
          <Field>
            <FieldLabel>Verification code</FieldLabel>
            <Input
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              maxLength={6}
              disabled={isLocked}
            />
          </Field>
        </FieldGroup>

        {isLocked && (
          <p className="text-sm text-amber-600 mb-3">
            Account locked. Try again in <span className="font-mono font-medium">{fmt(lockSecondsLeft)}</span>
          </p>
        )}

        {!isLocked && attemptsLeft !== null && attemptsLeft > 0 && (
          <p className="text-sm text-amber-600 mb-3">{attemptsLeft} attempt{attemptsLeft !== 1 ? "s" : ""} remaining</p>
        )}

        {error && !isLocked && <p className="text-sm text-red-500 mb-3">{error}</p>}

        <Button className="w-full mb-3" type="submit" disabled={loading || isLocked || otp.length !== 6}>
          {loading ? "Verifying..." : "Verify"}
        </Button>

        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={handleResend}
            disabled={resendSecondsLeft > 0 || loading}
            className="text-zinc-600 hover:text-zinc-900 disabled:text-zinc-400 disabled:cursor-not-allowed transition-colors"
          >
            {resendSecondsLeft > 0
              ? `Resend in ${resendSecondsLeft}s`
              : "Resend code"}
          </button>
          <button
            type="button"
            onClick={() => { setStep("details"); setError(""); }}
            className="text-zinc-500 hover:text-zinc-700 transition-colors"
          >
            Change email
          </button>
        </div>
      </form>
    );
  }

  return (
    <form className="py-4" onSubmit={handleSendOtp}>
      <h2 className="text-lg font-semibold text-zinc-900 mb-4">Create account</h2>

      <FieldGroup>
        <Field>
          <FieldLabel>Username</FieldLabel>
          <Input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
        </Field>
      </FieldGroup>

      <FieldGroup className="my-4">
        <Field>
          <FieldLabel>Email</FieldLabel>
          <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
      </FieldGroup>

      <FieldGroup className="my-4">
        <Field>
          <FieldLabel>Password</FieldLabel>
          <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
      </FieldGroup>

      <FieldGroup className="my-4">
        <Field>
          <FieldLabel>Confirm Password</FieldLabel>
          <Input type="password" placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
      </FieldGroup>

      {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

      <Button className="w-full" type="submit" disabled={loading}>
        {loading ? "Sending code..." : "Continue"}
      </Button>

      <p className="text-center text-sm text-zinc-500 mt-4">
        Already have an account?{" "}
        <Link href="/auth/signin" className="text-zinc-900 font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/src/components/ui/field";
import { Input } from "@/src/components/ui/input";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to send code");
        return;
      }
      setStep("reset");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to reset password");
        return;
      }
      setDone(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex justify-center items-center h-screen w-screen overflow-hidden">
      <div className="bg-white p-5 rounded-md w-full max-w-sm">
        {done ? (
          <div className="py-4 text-center space-y-4">
            <p className="text-zinc-900 font-semibold">Password reset!</p>
            <p className="text-sm text-zinc-500">You can now sign in with your new password.</p>
            <Link href="/auth/signin" className="block w-full">
              <Button className="w-full">Sign in</Button>
            </Link>
          </div>
        ) : step === "email" ? (
          <form className="py-4" onSubmit={handleSendCode}>
            <h2 className="text-lg font-semibold text-zinc-900 mb-1">Forgot password</h2>
            <p className="text-sm text-zinc-500 mb-4">Enter your linked email and we will send you a reset code.</p>

            <FieldGroup>
              <Field>
                <FieldLabel>Email</FieldLabel>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
            </FieldGroup>

            {error && <p className="text-sm text-red-500 mt-3">{error}</p>}

            <Button className="w-full mt-5" type="submit" disabled={loading}>
              {loading ? "Sending..." : "Send code"}
            </Button>

            <p className="text-center text-sm text-zinc-500 mt-4">
              <Link href="/auth/signin" className="text-zinc-900 font-medium hover:underline">
                Back to sign in
              </Link>
            </p>
          </form>
        ) : (
          <form className="py-4" onSubmit={handleReset}>
            <h2 className="text-lg font-semibold text-zinc-900 mb-1">Reset password</h2>
            <p className="text-sm text-zinc-500 mb-4">Enter the code sent to {email}.</p>

            <FieldGroup>
              <Field>
                <FieldLabel>Code</FieldLabel>
                <Input
                  placeholder="6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
              </Field>
            </FieldGroup>

            <FieldGroup className="my-4">
              <Field>
                <FieldLabel>New password</FieldLabel>
                <Input
                  type="password"
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </Field>
            </FieldGroup>

            <FieldGroup className="my-4">
              <Field>
                <FieldLabel>Confirm password</FieldLabel>
                <Input
                  type="password"
                  placeholder="Confirm password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </Field>
            </FieldGroup>

            {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "Resetting..." : "Reset password"}
            </Button>

            <p className="text-center text-sm text-zinc-500 mt-4">
              <button type="button" onClick={() => { setStep("email"); setError(""); }} className="text-zinc-900 font-medium hover:underline">
                Use a different email
              </button>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}

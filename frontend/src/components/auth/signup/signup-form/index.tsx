"use client";

import { useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/src/components/ui/field";
import { Input } from "@/src/components/ui/input";
import Link from "next/link";

export default function SignupForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        window.location.href = "/auth/signin";
      } else {
        setError(data.error || "Signup failed");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="py-4" onSubmit={handleSubmit}>
      <h2 className="text-lg font-semibold text-zinc-900 mb-4">Create account</h2>

      <FieldGroup>
        <Field>
          <FieldLabel>Username</FieldLabel>
          <Input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
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
        {loading ? "Creating account..." : "Sign up"}
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

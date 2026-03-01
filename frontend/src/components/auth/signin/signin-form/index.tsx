"use client";

import { Button } from "@/src/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/src/components/ui/field";
import { Input } from "@/src/components/ui/input";
import { useState, useEffect, useCallback } from "react";

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

export default function SigninForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleCredential = useCallback(async (response: { credential: string }) => {
    setGoogleLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential }),
      });
      if (res.ok) {
        window.location.href = "/dashboard";
      } else {
        const data = await res.json();
        setError(data.error || "Google sign-in failed");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  }, []);

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const existingScript = document.getElementById("google-gsi");
    if (existingScript) {
      initGoogle(clientId);
      return;
    }

    const script = document.createElement("script");
    script.id = "google-gsi";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => initGoogle(clientId);
    document.body.appendChild(script);
  }, [handleGoogleCredential]);

  function initGoogle(clientId: string) {
    window.google?.accounts.id.initialize({
      client_id: clientId,
      callback: handleGoogleCredential,
    });
    const btn = document.getElementById("google-signin-btn");
    if (btn) {
      window.google?.accounts.id.renderButton(btn, {
        theme: "outline",
        size: "large",
        width: btn.offsetWidth || 320,
        text: "signin_with",
      });
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    try {
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.message || "Sign in failed");
        return;
      }

      window.location.href = "/dashboard";
    } catch {
      setError("Network error. Please try again.");
    }
  };

  const showGoogle = !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  return (
    <form className="py-4" onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel>Username</FieldLabel>
          <Input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </Field>
      </FieldGroup>

      <FieldGroup className="my-5">
        <Field>
          <FieldLabel>Password</FieldLabel>
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
      </FieldGroup>

      <Field>
        <FieldLabel className="text-red-500">{error}</FieldLabel>
      </Field>

      <Button className="w-full" type="submit">
        Submit
      </Button>

      {showGoogle && (
        <>
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {googleLoading ? (
            <div className="w-full h-10 flex items-center justify-center text-sm text-gray-500">
              Signing in…
            </div>
          ) : (
            <div id="google-signin-btn" className="w-full flex justify-center" />
          )}
        </>
      )}
    </form>
  );
}

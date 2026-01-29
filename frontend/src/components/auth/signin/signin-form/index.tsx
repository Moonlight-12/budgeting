"use client";

import { Button } from "@/src/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/src/components/ui/field";
import { Input } from "@/src/components/ui/input";
import { useState } from "react";

export default function SigninForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    try {
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.message || "Sign in failed");
        return;
      }

      window.location.href = "/dashboard";
    } catch (error) {
      setError("Network error. Please try again.");
    }
  };

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
    </form>
  );
}

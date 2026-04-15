"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Currency = "AUD" | "IDR";

interface CurrencyContextValue {
  preferredCurrency: Currency;
  setCurrency: (c: Currency) => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  preferredCurrency: "AUD",
  setCurrency: async () => {},
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [preferredCurrency, setPreferredCurrency] = useState<Currency>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("preferredCurrency") as Currency) ?? "AUD";
    }
    return "AUD";
  });

  // Sync from server on mount
  useEffect(() => {
    fetch("/api/users/profile")
      .then((r) => r.json())
      .then((data) => {
        const c = data.user?.preferredCurrency as Currency | undefined;
        if (c === "AUD" || c === "IDR") {
          setPreferredCurrency(c);
          localStorage.setItem("preferredCurrency", c);
        }
      })
      .catch(() => {});
  }, []);

  const setCurrency = async (c: Currency) => {
    setPreferredCurrency(c);
    localStorage.setItem("preferredCurrency", c);
    try {
      await fetch("/api/users/preference", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferredCurrency: c }),
      });
    } catch {}
  };

  return (
    <CurrencyContext.Provider value={{ preferredCurrency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}

"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Currency = "AUD" | "IDR";

interface CurrencyContextValue {
  preferredCurrency: Currency;
  setCurrency: (c: Currency) => Promise<void>;
  billingStartDay: number;
  setBillingStartDay: (day: number) => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  preferredCurrency: "AUD",
  setCurrency: async () => {},
  billingStartDay: 1,
  setBillingStartDay: async () => {},
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [preferredCurrency, setPreferredCurrency] = useState<Currency>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("preferredCurrency") as Currency) ?? "AUD";
    }
    return "AUD";
  });

  const [billingStartDay, setBillingStartDayState] = useState<number>(() => {
    if (typeof window !== "undefined") {
      return parseInt(localStorage.getItem("billingStartDay") ?? "1") || 1;
    }
    return 1;
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
        const d = data.user?.billingStartDay;
        if (typeof d === "number" && d >= 1 && d <= 28) {
          setBillingStartDayState(d);
          localStorage.setItem("billingStartDay", String(d));
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

  const setBillingStartDay = async (day: number) => {
    setBillingStartDayState(day);
    localStorage.setItem("billingStartDay", String(day));
    try {
      await fetch("/api/users/preference", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billingStartDay: day }),
      });
    } catch {}
  };

  return (
    <CurrencyContext.Provider value={{ preferredCurrency, setCurrency, billingStartDay, setBillingStartDay }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}

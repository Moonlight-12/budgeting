"use client";

import { HeroUIProvider } from "@heroui/system";
import { CurrencyProvider } from "@/src/contexts/currency-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <HeroUIProvider>
      <CurrencyProvider>{children}</CurrencyProvider>
    </HeroUIProvider>
  );
}

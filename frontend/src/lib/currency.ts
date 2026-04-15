// 1 AUD = 11,000 IDR
export const AUD_TO_IDR = 11000;

/**
 * Convert a stored value to the preferred display currency.
 * AUD transactions are stored as cents (integer).
 * IDR transactions are stored as whole rupiah (integer).
 */
export function toDisplayValue(valueInCents: number, txnCurrency: string, preferredCurrency: string): number {
  if (txnCurrency === preferredCurrency) return valueInCents;

  if (txnCurrency === "AUD" && preferredCurrency === "IDR") {
    // cents → AUD → IDR: (cents / 100) * 11000 = cents * 110
    return Math.round(valueInCents * 110);
  }

  if (txnCurrency === "IDR" && preferredCurrency === "AUD") {
    // rupiah → IDR → AUD cents: (rupiah / 11000) * 100 = rupiah / 110
    return Math.round(valueInCents / 110);
  }

  return valueInCents;
}

/**
 * Format a display value (already in preferred currency's units) as a string.
 */
export function fmtCurrency(value: number, currency: string, showSign = false): string {
  const sign = showSign ? (value < 0 ? "-" : "+") : (value < 0 ? "-" : "");
  const abs = Math.abs(value);

  if (currency === "IDR") {
    return `${sign}Rp${abs.toLocaleString("id-ID")}`;
  }
  // AUD — value is in cents
  return `${sign}A$${(abs / 100).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Full helper: convert + format in one step.
 */
export function fmt(valueInCents: number, txnCurrency: string, preferredCurrency: string, showSign = false): string {
  const display = toDisplayValue(valueInCents, txnCurrency, preferredCurrency);
  return fmtCurrency(display, preferredCurrency, showSign);
}

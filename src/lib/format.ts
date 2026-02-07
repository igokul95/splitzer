/**
 * Format a number as currency with the appropriate symbol.
 * e.g. formatCurrency(1234.56, "INR") => "₹1,234.56"
 */
export function formatCurrency(
  amount: number,
  currencyCode: string = "INR"
): string {
  const absAmount = Math.abs(amount);
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(absAmount);
  } catch {
    // Fallback for unsupported currencies
    const symbol = CURRENCY_SYMBOLS[currencyCode] ?? currencyCode;
    return `${symbol}${absAmount.toFixed(2)}`;
  }
}

/**
 * Get just the currency symbol for a given code.
 */
export function getCurrencySymbol(currencyCode: string): string {
  return CURRENCY_SYMBOLS[currencyCode] ?? currencyCode;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  AUD: "A$",
  CAD: "C$",
  SGD: "S$",
  AED: "د.إ",
  THB: "฿",
  MYR: "RM",
};

/**
 * Supported currencies for the currency selector.
 */
export const SUPPORTED_CURRENCIES = [
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
  { code: "THB", name: "Thai Baht", symbol: "฿" },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM" },
];

/**
 * Group type display helpers
 */
export type GroupType = "trip" | "home" | "couple" | "other";

export const GROUP_TYPE_CONFIG: Record<
  GroupType,
  { label: string; icon: string; bgColor: string; textColor: string }
> = {
  trip: {
    label: "Trip",
    icon: "Plane",
    bgColor: "bg-orange-500",
    textColor: "text-white",
  },
  home: {
    label: "Home",
    icon: "Home",
    bgColor: "bg-teal-600",
    textColor: "text-white",
  },
  couple: {
    label: "Couple",
    icon: "Heart",
    bgColor: "bg-pink-500",
    textColor: "text-white",
  },
  other: {
    label: "Other",
    icon: "LayoutGrid",
    bgColor: "bg-gray-500",
    textColor: "text-white",
  },
};

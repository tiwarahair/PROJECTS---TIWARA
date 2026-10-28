// The one money formatter: "£85", "£85.50", "£1,120.00", "−£20".

interface FormatMoneyOptions {
  /** "auto" drops ".00" on whole pounds; "always" keeps two decimals. */
  pence?: "auto" | "always";
}

const currency = { style: "currency", currency: "GBP" } as const;

const wholePounds = new Intl.NumberFormat("en-GB", {
  ...currency,
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const withPence = new Intl.NumberFormat("en-GB", {
  ...currency,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const roundToPence = (amount: number): number =>
  Math.round(amount * 100) / 100;

export const formatMoney = (
  value: number,
  { pence = "auto" }: FormatMoneyOptions = {},
): string => {
  const rounded = roundToPence(value);
  const absolute = Math.abs(rounded);
  const isWhole = pence === "auto" && Number.isInteger(absolute);
  const sign = rounded < 0 ? "−" : "";

  return `${sign}${(isWhole ? wholePounds : withPence).format(absolute)}`;
};

export const toPence = (pounds: number): number => Math.round(pounds * 100);

export const toPounds = (pence: number): number => pence / 100;

/** Pence as money: "£12.50", or "£12" with { pence: "auto" }. */
export const formatPence = (
  pence: number,
  { pence: decimals = "always" }: FormatMoneyOptions = {},
): string => formatMoney(toPounds(pence), { pence: decimals });

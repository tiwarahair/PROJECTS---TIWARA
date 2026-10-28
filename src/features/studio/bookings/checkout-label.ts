import { formatMoney, roundToPence } from "../../../utils/money";
import type { CheckoutRecord } from "../core/types";

const VIA_NAMES: Record<string, string> = {
  cash: "Cash",
  bank: "Bank transfer",
  reader: "Card reader",
};

/** How a finished checkout reads in Past and on the booking. */
export const getCheckoutLabel = (
  { method, charged, via, refundAuto, cashBack = 0 }: CheckoutRecord,
  link?: { isPaid?: boolean; isExpired?: boolean },
) => {
  if (method === "link" && link?.isPaid) return "Paid · Link";

  if (method === "link" && link?.isExpired) return "Link expired · Resend";

  if (method === "link") return `Link sent · ${formatMoney(charged)} due`;

  if (method === "record") return `Paid · ${VIA_NAMES[via] || "Recorded"}`;

  if (method === "card") return "Paid · Card";

  const refunded = roundToPence(refundAuto + cashBack);

  return refunded > 0 ? `Refunded ${formatMoney(refunded)}` : "Paid";
};

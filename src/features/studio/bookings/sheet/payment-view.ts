import type { DecoratedBooking } from "../decorate";
import { formatMoney } from "../../../../utils/money";
import type { SheetContext } from "./context";
import type { ReceivedLine } from "./types";

const getReceived = (booking: DecoratedBooking): ReceivedLine => {
  const { paidKind } = booking;

  if (paidKind === "deposit" || paidKind === "full")
    return {
      key: "paid",
      label: paidKind === "deposit" ? "Deposit" : "Paid in full",
      subtitle: "Card · online at booking",
      value: `${formatMoney(booking.price - booking.dueAmount)}`,
      tone: "paid",
    };

  if (booking.awaiting)
    return {
      key: "link",
      label: booking.protectionWord,
      subtitle: `Link sent ${booking.linkSentLabel || ""}`,
      value: "Pending",
      tone: "quiet",
    };

  if (paidKind === "failed")
    return {
      key: "failed",
      label: "Card payment",
      subtitle: "Declined",
      value: "£0",
      tone: "failed",
    };

  return {
    key: "none",
    label: "Nothing paid yet",
    subtitle: booking.noProtect
      ? "No booking protection"
      : "Collect at checkout",
    value: "£0",
    tone: "quiet",
  };
};

// ---- the payment breakdown ----
export const getPaymentView = ({
  booking,
  addonLines,
  servicePrice,
}: SheetContext) => ({
  payLines: [
    {
      key: "svc",
      label: booking.service,
      value: `${formatMoney(servicePrice)}`,
    },
  ].concat(addonLines.map(({ key, label, value }) => ({ key, label, value }))),
  payReceived: [getReceived(booking)],
  payFeeLabel: formatMoney(
    Math.round((booking.price * 0.015 + 0.5) * 100) / 100,
    { pence: "always" },
  ),
  feeWho: booking.client ? booking.firstName : "the client",
  payRowLabel: booking.dueAmount > 0 ? "To pay" : "Paid",
});

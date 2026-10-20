import { DEFAULT_STYLIST } from "./data";
import { RECORD_VIA_LABELS } from "./view";
import type { CheckoutViewModel } from "./view";
import type { CheckoutController } from "./use-checkout";
import { formatMoney } from "../../utils/money";

const formatPence = (amount: number) =>
  formatMoney(amount, { pence: "always" });

export const getReceiptView = (
  { props, state, booking, money }: CheckoutController,
  { cardText }: CheckoutViewModel,
) => {
  const done = state.done ?? {
    method: money.method,
    charged: money.charge,
    tip: money.tip,
    refundAuto: money.refundCard,
    cashBack: money.cashBack,
    via: state.recordVia,
  };

  const lines = state.lines.flatMap((line) => [
    {
      key: `l${line.id}`,
      label: line.name,
      value: formatPence(line.base),
      isAdjust: false,
    },
    ...(line.adjustment
      ? [
          {
            key: `a${line.id}`,
            label: `Price adjusted: ${line.reason}`,
            value: formatPence(line.adjustment),
            isAdjust: true,
          },
        ]
      : []),
  ]);

  const via = RECORD_VIA_LABELS[done.via] ?? "";

  const pays = [
    state.paid > 0 && {
      key: "p",
      label: state.mode === "full" ? "Prepayment applied" : "Deposit applied",
      subtitle: `Paid at booking${booking.paidOn ? `, ${booking.paidOn}` : ""}`,
      value: formatPence(-state.paid),
    },
    !!booking.paidLater &&
      booking.paidLater > 0 && {
        key: "pl",
        label: "Paid at an earlier checkout",
        subtitle: `${RECORD_VIA_LABELS[booking.recordedVia ?? ""] ?? "Recorded"}, recorded by the stylist`,
        value: formatPence(-booking.paidLater),
      },
    done.charged > 0 && {
      key: "c",
      label: done.method === "link" ? "Awaiting payment" : "Paid at checkout",
      subtitle:
        done.method === "record" ? `${via}, recorded by the stylist` : "",
      value: formatPence(done.charged),
    },
    done.refundAuto > 0 && {
      key: "ra",
      label: "Refunded to card",
      subtitle: "Price lowered after booking",
      value: formatPence(done.refundAuto),
    },
    !!done.cashBack && {
      key: "cb",
      label: "Given back",
      subtitle: `${RECORD_VIA_LABELS[booking.recordedVia ?? ""] ?? "Recorded"}, price lowered after booking`,
      value: formatPence(done.cashBack),
    },
    state.refunded > 0 && {
      key: "rf",
      label: "Refunded",
      subtitle: state.refundLast,
      value: formatPence(state.refunded),
    },
  ].filter((pay) => !!pay);

  const paid =
    state.paid +
    (booking.paidLater ?? 0) +
    money.bookFee +
    (done.method === "link" ? 0 : done.charged) -
    done.refundAuto -
    (done.cashBack ?? 0) -
    state.refunded;

  const getMethod = () => {
    if (done.method === "record") return `${via} (recorded)`;

    if (done.method === "link") return "payment link, not paid yet";

    return cardText || "card";
  };

  const stylist = { ...DEFAULT_STYLIST, ...props.stylist };

  return {
    stylist: stylist.name,
    address: stylist.address,
    vat: stylist.vat,
    number: "Receipt TH-20418",
    date: `${booking.day} 2026`,
    client: `For ${booking.client}`,
    lines,
    subtotal: formatPence(money.items),
    tip: done.tip > 0 ? formatPence(done.tip || 0) : "",
    pays,
    fee: money.bookFee > 0 ? formatPence(money.bookFee) : "",
    paid: formatPence(paid),
    method: getMethod(),
  };
};

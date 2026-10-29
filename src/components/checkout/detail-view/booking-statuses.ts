import { ICONS } from "../data";
import { RECORD_VIA_LABELS, row } from "../view";
import type { DetailRow } from "../view";
import type { DetailBuilder, DetailContext } from "./context";
import { formatMoney } from "../../../utils/money";

const getPaidRows = ({ checkout: { state, booking }, view }: DetailContext) => {
  const { done, cardText, isOffPlatform } = view;

  const doneVia =
    done.method === "record" ? (RECORD_VIA_LABELS[done.via] ?? "") : cardText;

  const tipNote =
    done.tip > 0 ? ` · includes ${formatMoney(done.tip)} tip` : "";

  return [
    state.paid > 0 &&
      row(
        state.mode === "full"
          ? "Paid in full at booking"
          : "Deposit paid at booking",
        `${cardText} · ${booking.paidOn}`,
        formatMoney(state.paid),
      ),
    done.charged > 0 &&
      row(
        done.method === "record" ? "Recorded at checkout" : "Paid at checkout",
        `${doneVia} · 15:08${tipNote}`,
        formatMoney(done.charged),
      ),
    done.refundAuto > 0 &&
      row("Refunded automatically", cardText, formatMoney(-done.refundAuto)),
    state.refunded > 0 &&
      row(
        isOffPlatform ? "Refund recorded" : "Refund",
        state.refundLast,
        formatMoney(-state.refunded),
      ),
  ].filter((paidRow): paidRow is DetailRow => !!paidRow);
};

export const BOOKING_DETAILS = {
  arrived: ({ checkout: { booking }, view, lineRows, modeBadge }) => ({
    badges: [
      {
        label: `Arrived ${booking.arrived}`,
        tone: "neutral",
        icon: ICONS.person,
      },
      modeBadge,
    ],
    rows: [...lineRows, ...view.creditRows],
    total: { label: view.balanceLabel, value: view.balanceValue },
  }),
  unpaid: ({ checkout: { booking }, view, lineRows, modeBadge }) => ({
    badges: [
      { label: "Completed · Unpaid", tone: "rust", icon: ICONS.alert },
      modeBadge,
    ],
    panel: {
      tone: "neutral",
      icon: ICONS.clock,
      title: "Not checked out",
      body: `Marked Unpaid 1 hour after the ${booking.time.split("–")[1]} end time. It stays in Due for checkout until you check out.`,
    },
    rows: [...lineRows, ...view.creditRows],
    total: { label: view.balanceLabel, value: view.balanceValue },
  }),
  paid: (context) => {
    const { checkout, view, refundBadges, refundActions } = context;
    const { state, setState, goTo } = checkout;
    const { done } = view;

    return {
      badges: [
        { label: "Completed · Paid", tone: "green", icon: ICONS.check },
        ...refundBadges,
      ],
      rows: getPaidRows(context),
      total: {
        label: "Total paid",
        value: formatMoney(
          state.paid + done.charged - done.refundAuto - state.refunded,
        ),
      },
      links: [
        {
          key: "v",
          label: "View receipt",
          icon: ICONS.receipt,
          run: () => {
            setState({ fromDone: false });
            goTo("receipt", 1);
          },
        },
        {
          key: "r",
          label: "Resend receipt",
          icon: ICONS.send,
          run: () => {
            checkout.startResend("email");
            setState({ isResendFromReceipt: false });
            goTo("resend", 1);
          },
        },
      ],
      actions: refundActions,
    };
  },
  awaiting: ({ checkout, view, lineRows }) => {
    const { state, setState, goTo, showToast, booking } = checkout;

    const sentTo =
      state.linkVia === "sms"
        ? `SMS to ${booking.phone}`
        : `email to ${booking.email}`;

    return {
      badges: [
        {
          label: "Completed · Awaiting payment",
          tone: "rust",
          icon: ICONS.clock,
        },
      ],
      panel: {
        tone: "neutral",
        icon: ICONS.link,
        title: "Payment link sent",
        body: `Sent by ${sentTo} at 15:08. ${view.name} can pay by card, Apple Pay or Google Pay, and add a tip.`,
      },
      rows: [...lineRows, ...view.creditRows],
      total: {
        label: "Awaiting payment",
        value: formatMoney(view.done.charged),
      },
      actions: [
        {
          label: "Resend link",
          run: () => showToast(`Payment link resent to ${view.linkTarget}`),
          kind: "secondary",
        },
        {
          label: "Record as paid",
          run: () => {
            setState({ method: "record" });
            goTo("pay", 1);
          },
          kind: "secondary",
        },
        {
          label: "Cancel link",
          run: () => setState({ dialog: "cancelLink" }),
          kind: "ghost",
        },
      ],
    };
  },
} satisfies Record<"arrived" | "unpaid" | "paid" | "awaiting", DetailBuilder>;

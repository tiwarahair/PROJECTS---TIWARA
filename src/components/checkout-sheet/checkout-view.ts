// CheckoutSheet derived values: booking detail, dialogs, footer and receipt.
import {
  ICONS,
  DEFAULT_STYLIST,
  formatPence,
  formatPounds,
  getRefundContext,
  parsePounds,
  roundPounds,
} from "./checkout-data";
import type { CheckoutLine, CheckoutView, PayMethod } from "./checkout-data";
import type { CheckoutController, CheckoutSheetProps } from "./use-checkout";

export interface DetailRow {
  key: string;
  label: string;
  subtitle: string;
  value: string;
  isAlert: boolean;
}

export type Tone = "green" | "rust" | "red" | "neutral";

export interface Badge {
  label: string;
  icon: string;
  tone: Tone;
}

export interface DetailAction {
  label: string;
  run: () => void;
  kind: "primary" | "secondary" | "ghost";
}

export const TONES: Record<Tone, { foreground: string; background: string }> = {
  green: { foreground: "#2f7a4d", background: "rgba(47,122,77,.10)" },
  rust: { foreground: "var(--accent-500)", background: "rgba(181,84,31,.10)" },
  red: { foreground: "var(--accent-700)", background: "var(--accent-wash)" },
  neutral: {
    foreground: "var(--neutral-700)",
    background: "var(--fill-quiet)",
  },
};

export const RECORD_VIA_LABELS: Record<string, string> = {
  cash: "Cash",
  bank: "Bank transfer",
  reader: "Own card reader",
};

const REVIEW_TOTAL_LABELS: Record<PayMethod, string> = {
  card: "To charge",
  link: "Payment link for",
  record: "To record",
};

export const STEP_LABELS: Partial<Record<CheckoutView, string>> = {
  items: "Items",
  tip: "Tip",
  pay: "Payment",
  review: "Review",
};

export const VIEW_TITLES: Record<CheckoutView, string> = {
  detail: "Booking",
  items: "Checkout",
  tip: "Checkout",
  pay: "Checkout",
  review: "Checkout",
  done: "",
  receipt: "Receipt",
  refund: "Refund",
  resend: "Resend receipt",
  add: "Add item",
};

const row = (
  label: string,
  subtitle: string,
  value: string,
  isAlert = false,
): DetailRow => ({ key: label + value, label, subtitle, value, isAlert });

export const getAdjustNote = ({ adjustment, reason }: CheckoutLine): string => {
  const direction = adjustment < 0 ? "Lowered " : "Raised ";
  const amount = formatPounds(Math.abs(adjustment));

  return `${direction}${amount}: ${reason}`;
};

/** Everything the views read from the state. */
export const getCheckoutView = (
  checkout: CheckoutController,
  props: CheckoutSheetProps,
) => {
  const { state, setState, booking, money, goTo, showToast, isEmbedded } =
    checkout;

  const { first: name } = booking;
  const cardText = booking.card ? `${booking.brand} •••• ${booking.card}` : "";
  let bookedTotal = booking.price;

  for (const [, price] of booking.addons) bookedTotal += price;

  const modeLabel = {
    deposit: `${Math.round((state.paid / bookedTotal) * 100)}% deposit`,
    full: "Full payment",
    card: "Card protection",
    none: "No protection",
  }[state.mode];

  const creditRows =
    state.paid > 0
      ? [
          row(
            state.mode === "full" ? "Paid in full" : "Deposit paid",
            cardText + (booking.paidOn ? ` · ${booking.paidOn}` : ""),
            formatPounds(-state.paid),
          ),
        ]
      : [];

  const isRefund = money.refundDue > 0;
  const balanceLabel = isRefund ? "Refund due" : "Balance due";
  const balanceValue = formatPounds(isRefund ? money.refundDue : money.due);
  const isInCheckout = ["items", "tip", "pay", "review"].includes(state.view);
  const stepIndex = money.steps.indexOf(state.view);

  const goNext = () =>
    goTo(money.steps[Math.min(stepIndex + 1, money.steps.length - 1)]!, 1);

  const back = () => {
    if (isInCheckout) {
      if (stepIndex > 0) goTo(money.steps[stepIndex - 1]!, -1);
      else goTo("detail", -1);
    } else if (state.view === "add") goTo("items", -1);
    else if (state.view === "receipt" && state.fromDone) goTo("done", -1);
    else goTo("detail", -1);
  };

  const done = state.done ?? {
    method: "none" as const,
    via: "",
    charged: 0,
    tip: 0,
    refundAuto: 0,
  };

  const refundContext = getRefundContext(state, booking);
  const isOffPlatform = !(refundContext.platform > 0);

  const refundCapAll = roundPounds(
    isOffPlatform ? refundContext.off : refundContext.platform,
  );

  const refundCap = roundPounds(refundCapAll - state.refunded);
  const fee = booking.fee || 0;
  const feeExtra = Math.max(0, fee - state.paid);

  const openRefund = () => {
    setState({
      refundKind: "full",
      refundAmount: "",
      refundReason: "",
      refundTried: false,
    });

    goTo("refund", 1);
  };

  // booking detail
  let badges: Badge[] = [];

  let panel: {
    tone: "red" | "neutral";
    icon: string;
    title: string;
    body: string;
  } | null = null;

  let rows: DetailRow[] = [];
  let total = { label: "", value: "" };

  let links: { key: string; label: string; icon: string; run: () => void }[] =
    [];

  let actions: DetailAction[] = [];
  let hasUndo = false;

  const lineRows = state.lines.map((line) =>
    row(
      line.name,
      line.adjustment ? getAdjustNote(line) : line.subtitle,
      formatPounds(line.base + line.adjustment),
    ),
  );

  const modeBadge: Badge = {
    label: modeLabel,
    tone: "neutral",
    icon: ICONS.card,
  };

  const refundBadges: Badge[] =
    state.refunded > 0
      ? [
          {
            label:
              refundCap <= 0
                ? "Refunded"
                : `Partially refunded ${formatPounds(state.refunded)}`,
            tone: "neutral",
            icon: ICONS.returnArrow,
          },
        ]
      : [];

  const chargeLabel =
    state.status === "feeCollected" ? "Charged to card" : "To charge to card";

  const getFeeRows = () => {
    if (state.mode === "deposit")
      return [
        row(
          "Deposit kept",
          `${cardText} · paid ${booking.paidOn}`,
          formatPounds(state.paid),
        ),
        row(
          state.status === "feeUnpaid" ? "Unpaid" : chargeLabel,
          cardText,
          formatPounds(feeExtra),
          state.status === "feeUnpaid",
        ),
      ];

    if (state.mode === "full")
      return [
        row("Kept from full payment", cardText, formatPounds(fee)),
        row("Refunded", cardText, formatPounds(state.paid - fee)),
      ];

    return [row(chargeLabel, cardText, formatPounds(fee))];
  };

  const feeRows = getFeeRows();

  const getWaiveWhat = () => {
    if (state.mode === "deposit")
      return state.isNonRefundable
        ? `She won’t be charged the extra ${formatPounds(feeExtra)}. Her ${formatPounds(state.paid)} deposit is non-refundable and will be kept.`
        : `Her ${formatPounds(state.paid)} deposit will be refunded and she won’t be charged anything else.`;

    if (state.mode === "full")
      return `The ${formatPounds(fee)} will be refunded to her card.`;

    return "She won’t be charged.";
  };

  const waiveWhat = getWaiveWhat();

  const getWaivedWhat = () => {
    if (state.mode === "deposit")
      return state.isNonRefundable
        ? `${name} wasn’t charged the extra ${formatPounds(feeExtra)}. Her ${formatPounds(state.paid)} deposit is non-refundable and was kept.`
        : `Her ${formatPounds(state.paid)} deposit was refunded and she wasn’t charged anything else.`;

    if (state.mode === "full")
      return `The ${formatPounds(fee)} was refunded to her card.`;

    return `${name} wasn’t charged.`;
  };

  const waivedWhat = getWaivedWhat();
  const linkTarget = state.linkVia === "sms" ? booking.phone : booking.email;

  const doneVia =
    done.method === "record" ? (RECORD_VIA_LABELS[done.via] ?? "") : cardText;

  const tipNote =
    done.tip > 0 ? ` · includes ${formatPounds(done.tip)} tip` : "";

  const depositNote =
    state.paid > 0
      ? ` Her ${formatPounds(state.paid)} deposit is kept towards it.`
      : "";

  const feeExtraText = formatPounds(feeExtra);

  switch (state.status) {
    case "arrived":
      badges = [
        {
          label: `Arrived ${booking.arrived}`,
          tone: "neutral",
          icon: ICONS.person,
        },
        modeBadge,
      ];

      rows = [...lineRows, ...creditRows];
      total = { label: balanceLabel, value: balanceValue };
      break;
    case "unpaid":
      badges = [
        { label: "Completed · Unpaid", tone: "rust", icon: ICONS.alert },
        modeBadge,
      ];

      panel = {
        tone: "neutral",
        icon: ICONS.clock,
        title: "Not checked out",
        body: `Marked Unpaid 1 hour after the ${booking.time.split("–")[1]} end time. It stays in Due for checkout until you check out.`,
      };

      rows = [...lineRows, ...creditRows];
      total = { label: balanceLabel, value: balanceValue };
      break;
    case "paid":
      badges = [
        { label: "Completed · Paid", tone: "green", icon: ICONS.check },
        ...refundBadges,
      ];

      if (state.paid > 0)
        rows.push(
          row(
            state.mode === "full"
              ? "Paid in full at booking"
              : "Deposit paid at booking",
            `${cardText} · ${booking.paidOn}`,
            formatPounds(state.paid),
          ),
        );

      if (done.charged > 0)
        rows.push(
          row(
            done.method === "record"
              ? "Recorded at checkout"
              : "Paid at checkout",
            `${doneVia} · 15:08${tipNote}`,
            formatPounds(done.charged),
          ),
        );

      if (done.refundAuto > 0)
        rows.push(
          row(
            "Refunded automatically",
            cardText,
            formatPounds(-done.refundAuto),
          ),
        );

      if (state.refunded > 0)
        rows.push(
          row(
            isOffPlatform ? "Refund recorded" : "Refund",
            state.refundLast,
            formatPounds(-state.refunded),
          ),
        );

      total = {
        label: "Total paid",
        value: formatPounds(
          state.paid + done.charged - done.refundAuto - state.refunded,
        ),
      };

      links = [
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
            setState({ resendVia: "email", resendTo: booking.email });
            goTo("resend", 1);
          },
        },
      ];

      if (refundCap > 0)
        actions = [{ label: "Refund", run: openRefund, kind: "secondary" }];

      break;
    case "awaiting":
      badges = [
        {
          label: "Completed · Awaiting payment",
          tone: "rust",
          icon: ICONS.clock,
        },
      ];

      panel = {
        tone: "neutral",
        icon: ICONS.link,
        title: "Payment link sent",
        body: `Sent by ${state.linkVia === "sms" ? `SMS to ${booking.phone}` : `email to ${booking.email}`} at 15:08. ${name} can pay by card, Apple Pay or Google Pay, and add a tip.`,
      };

      rows = [...lineRows, ...creditRows];
      total = { label: "Awaiting payment", value: formatPounds(done.charged) };

      actions = [
        {
          label: "Resend link",
          run: () => showToast(`Payment link resent to ${linkTarget}`),
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
      ];

      break;
    case "feePending":
      badges = [
        { label: "No-show · Fee pending", tone: "rust", icon: ICONS.clock },
      ];

      panel = {
        tone: "neutral",
        icon: ICONS.clock,
        title: `${formatPounds(fee)} no-show fee`,
        body: `${name} didn’t turn up on ${booking.day}. The fee is charged automatically in 18h unless you waive it.`,
      };

      rows = feeRows;
      total = { label: "No-show fee", value: formatPounds(fee) };

      actions = [
        {
          label: `Waive ${formatPounds(fee)} fee (applies in 18h)`,
          run: () => setState({ dialog: "waive" }),
          kind: "secondary",
        },
      ];

      hasUndo = true;
      break;
    case "feeWaived":
      badges = [
        { label: "No-show · Fee waived", tone: "neutral", icon: ICONS.check },
      ];

      panel = {
        tone: "neutral",
        icon: ICONS.check,
        title: "Fee waived",
        body: `You waived the ${formatPounds(fee)} fee today at 16:20. ${waivedWhat} The booking fee isn’t refunded.`,
      };

      hasUndo = true;
      break;
    case "feeUnpaid":
      badges = [
        { label: "No-show · Fee unpaid", tone: "red", icon: ICONS.alert },
      ];

      panel = {
        tone: "red",
        icon: ICONS.alert,
        title: "Card declined: insufficient funds",
        body: `${feeExtraText} of ${name}’s ${formatPounds(fee)} fee couldn’t be charged to ${cardText}.${depositNote}`,
      };

      rows = feeRows;
      total = { label: "No-show fee", value: formatPounds(fee) };

      actions = [
        {
          label: "Retry card (1 of 2 left)",
          run: () => setState({ dialog: "retryFee" }),
          kind: "primary",
        },
        {
          label: "Send payment link",
          run: () =>
            showToast(
              `Payment link for ${feeExtraText} sent to ${booking.phone}`,
            ),
          kind: "secondary",
        },
        {
          label: "Record as paid",
          run: () => setState({ dialog: "recordFee" }),
          kind: "secondary",
        },
        {
          label: "Waive fee",
          run: () => setState({ dialog: "waive" }),
          kind: "ghost",
        },
      ];

      break;
    case "feeCollected":
      badges = [
        { label: "No-show · Fee collected", tone: "green", icon: ICONS.check },
        ...refundBadges,
      ];

      rows = feeRows.slice();

      if (state.refunded > 0)
        rows.push(
          row("Refund", state.refundLast, formatPounds(-state.refunded)),
        );

      total = {
        label: "Fee collected",
        value: formatPounds(fee - state.refunded),
      };

      if (refundCap > 0)
        actions = [{ label: "Refund", run: openRefund, kind: "secondary" }];

      break;
  }

  // refund
  const refundAmount =
    state.refundKind === "full" ? refundCap : parsePounds(state.refundAmount);

  const overError =
    state.refundKind === "partial" && refundAmount > refundCap
      ? `You can refund up to ${formatPounds(refundCap)}.`
      : "";

  const refundError =
    overError ||
    (state.refundTried && state.refundKind === "partial" && !(refundAmount > 0)
      ? "Enter an amount."
      : "");

  const isRefundValid =
    refundAmount > 0 && refundAmount <= refundCap && !!state.refundReason;

  // review
  const noPayTotalLabel = isRefund ? "Refund due" : "Nothing to pay";
  const noPayTotalValue = isRefund ? formatPounds(money.refundDue) : "£0";

  const reviewTotalLabel =
    money.method === "none"
      ? noPayTotalLabel
      : REVIEW_TOTAL_LABELS[money.method];

  const reviewTotalValue =
    money.method === "none" ? noPayTotalValue : formatPounds(money.charge);

  // receipt
  const receiptDone = state.done ?? {
    method: money.method,
    charged: money.charge,
    tip: money.tip,
    refundAuto: money.refundDue,
    via: state.recordVia,
  };

  const receiptLines: {
    key: string;
    label: string;
    value: string;
    isAdjust: boolean;
  }[] = [];

  for (const line of state.lines) {
    receiptLines.push({
      key: `l${line.id}`,
      label: line.name,
      value: formatPence(line.base),
      isAdjust: false,
    });

    if (line.adjustment)
      receiptLines.push({
        key: `a${line.id}`,
        label: `Price adjusted: ${line.reason}`,
        value: formatPence(line.adjustment),
        isAdjust: true,
      });
  }

  const receiptPays: {
    key: string;
    label: string;
    subtitle: string;
    value: string;
  }[] = [];

  if (state.paid > 0)
    receiptPays.push({
      key: "p",
      label: state.mode === "full" ? "Prepayment applied" : "Deposit applied",
      subtitle: `Paid at booking${booking.paidOn ? `, ${booking.paidOn}` : ""}`,
      value: formatPence(-state.paid),
    });

  const receiptVia = RECORD_VIA_LABELS[receiptDone.via] ?? "";

  if (receiptDone.charged > 0)
    receiptPays.push({
      key: "c",
      label:
        receiptDone.method === "link" ? "Awaiting payment" : "Paid at checkout",
      subtitle:
        receiptDone.method === "record"
          ? `${receiptVia}, recorded by the stylist`
          : "",
      value: formatPence(receiptDone.charged),
    });

  if (receiptDone.refundAuto > 0)
    receiptPays.push({
      key: "ra",
      label: "Refunded to card",
      subtitle: "Price lowered after booking",
      value: formatPence(receiptDone.refundAuto),
    });

  if (state.refunded > 0)
    receiptPays.push({
      key: "rf",
      label: "Refunded",
      subtitle: state.refundLast,
      value: formatPence(state.refunded),
    });

  const receiptPaid =
    state.paid +
    money.bookFee +
    (receiptDone.method === "link" ? 0 : receiptDone.charged) -
    receiptDone.refundAuto -
    state.refunded;

  const getReceiptMethod = () => {
    if (receiptDone.method === "record")
      return `${RECORD_VIA_LABELS[receiptDone.via] ?? ""} (recorded)`;

    if (receiptDone.method === "link") return "payment link, not paid yet";

    return cardText || "card";
  };

  const stylist = { ...DEFAULT_STYLIST, ...props.stylist };

  const receipt = {
    stylist: stylist.name,
    address: stylist.address,
    vat: stylist.vat,
    number: "Receipt TH-20418",
    date: `${booking.day} 2026`,
    client: `For ${booking.client}`,
    lines: receiptLines,
    subtotal: formatPence(money.items),
    tip: receiptDone.tip > 0 ? formatPence(receiptDone.tip || 0) : "",
    pays: receiptPays,
    fee: money.bookFee > 0 ? formatPence(money.bookFee) : "",
    paid: formatPence(receiptPaid),
    method: getReceiptMethod(),
  };

  // dialogs
  let dialog: {
    title: string;
    body: string;
    yes: string;
    cancel: string;
    run: () => void;
  } | null = null;

  switch (state.dialog) {
    case "waive":
      dialog = {
        title: `Waive ${name}’s ${formatPounds(fee)} fee?`,
        body: `${waiveWhat} The booking fee isn’t refunded.`,
        yes: "Waive fee",
        cancel: "Keep fee",
        run: () => {
          setState({ dialog: null, status: "feeWaived" });
          showToast("Fee waived");
        },
      };

      break;

    case "refund": {
      const amount = state.refundFinal || 0;

      dialog = {
        title: isOffPlatform
          ? `Record a ${formatPounds(amount)} refund?`
          : `Refund ${formatPounds(amount)} to ${name}’s card ending ${booking.card}?`,
        body: isOffPlatform
          ? "Recorded only, refund the client directly."
          : "It usually takes 5–10 business days to arrive. The card fee isn’t returned.",
        yes: isOffPlatform ? "Record refund" : `Refund ${formatPounds(amount)}`,
        cancel: "Cancel",
        run: () => {
          setState({
            dialog: null,
            refunded: roundPounds(state.refunded + amount),
            refundLast: state.refundReason,
          });

          props.onRefund?.(amount, state.refundReason, isOffPlatform);
          goTo("detail", -1);

          showToast(
            isOffPlatform
              ? "Refund recorded"
              : `Refund of ${formatPounds(amount)} on its way`,
          );
        },
      };

      break;
    }

    case "cancelLink":
      dialog = {
        title: "Cancel the payment link?",
        body: `${name} won’t be able to pay with it. The booking moves to Unpaid and back into Due for checkout.`,
        yes: "Cancel link",
        cancel: "Keep link",
        run: () => {
          setState({ dialog: null, status: "unpaid", done: null });
          showToast("Payment link cancelled");
          props.onCancelLink?.();
        },
      };

      break;
    case "retryFee":
      dialog = {
        title: `Charge ${formatPounds(feeExtra)} to ${name}’s card ending ${booking.card}?`,
        body: "This uses your last retry. If it’s declined again, send a payment link or record the payment instead.",
        yes: `Charge ${formatPounds(feeExtra)}`,
        cancel: "Not now",
        run: () => {
          setState({ dialog: null, status: "feeCollected" });
          showToast(`${formatPounds(feeExtra)} charged`);
        },
      };

      break;
    case "recordFee":
      dialog = {
        title: `Record ${formatPounds(feeExtra)} as paid?`,
        body: "Recorded only, no money moves through Tiwára’s House.",
        yes: "Record as paid",
        cancel: "Cancel",
        run: () => {
          setState({ dialog: null, status: "feeCollected" });
          showToast("Payment recorded");
        },
      };

      break;
    case "undoNs":
      dialog = {
        title: "Undo no-show?",
        body: `Only use this if ${name} did attend. It reverses the no-show entirely, with no fee, and the booking goes back to Arrived so you can check out.`,
        yes: "Undo no-show",
        cancel: "Cancel",
        run: () => {
          setState({ dialog: null, status: "arrived" });
          showToast("No-show undone");
        },
      };

      break;
    case null:
      break;
  }

  // footer
  const leaveDone = (action: "done" | "rebook") => {
    if (isEmbedded && props.onComplete)
      props.onComplete(checkout.getResult(), action);
    else if (action === "rebook") showToast(`New booking for ${name} started`);
    else goTo("detail", -1);
  };

  const footer = {
    show: false,
    hasTotal: false,
    totalLabel: "",
    totalValue: "",
    hasPrimary: true,
    primaryLabel: "",
    primaryRun: () => {},
    isPrimaryDisabled: false,
    hasSecondary: false,
    secondaryLabel: "",
    secondaryRun: () => {},
  };

  const setFooter = (patch: Partial<typeof footer>) =>
    Object.assign(footer, { show: true }, patch);

  if (
    state.view === "detail" &&
    (state.status === "arrived" || state.status === "unpaid")
  )
    setFooter({
      hasTotal: true,
      totalLabel: balanceLabel,
      totalValue: balanceValue,
      primaryLabel: "Checkout",
      primaryRun: checkout.startCheckout,
    });

  if (state.view === "items")
    setFooter({
      hasTotal: true,
      totalLabel: balanceLabel,
      totalValue: balanceValue,
      primaryLabel: "Continue",
      primaryRun: () => {
        setState({ adjustingLineId: null });
        goNext();
      },
    });

  if (state.view === "tip")
    setFooter({
      hasTotal: true,
      totalLabel: money.method === "record" ? "To record" : "To charge",
      totalValue: formatPounds(money.charge),
      primaryLabel: "Continue",
      primaryRun: goNext,
    });

  if (state.view === "pay")
    setFooter({
      hasTotal: true,
      totalLabel: isRefund ? "Refund due" : "Balance due",
      totalValue: isRefund
        ? formatPounds(money.refundDue)
        : formatPounds(money.due),
      primaryLabel: "Continue",
      primaryRun: goNext,
    });

  const getReviewPrimaryLabel = () => {
    if (state.busy) return "Charging";

    if (state.decline === "soft")
      return `Retry card (${state.tries} of 2 left)`;

    if (money.method === "card") return `Charge ${formatPounds(money.charge)}`;

    if (money.method === "link") return "Send link and complete";

    return "Complete checkout";
  };

  if (state.view === "review")
    setFooter({
      hasTotal: true,
      totalLabel: reviewTotalLabel,
      totalValue: reviewTotalValue,
      hasPrimary: state.decline !== "hard",
      isPrimaryDisabled: state.busy,
      primaryLabel: getReviewPrimaryLabel(),
      primaryRun: () => {
        if (!checkout.state.busy) checkout.complete();
      },
    });

  if (state.view === "done")
    setFooter({
      hasSecondary: true,
      secondaryLabel: "Book again",
      secondaryRun: () => leaveDone("rebook"),
      primaryLabel: "Done",
      primaryRun: () => leaveDone("done"),
    });

  if (state.view === "refund")
    setFooter({
      hasTotal: true,
      totalLabel: isOffPlatform ? "Refund to record" : "Refund",
      totalValue: formatPounds(
        isRefundValid || refundAmount <= refundCap ? refundAmount : 0,
      ),
      primaryLabel:
        (isOffPlatform ? "Record refund" : "Refund") +
        (refundAmount > 0 && refundAmount <= refundCap
          ? ` ${formatPounds(refundAmount)}`
          : ""),
      primaryRun: () => {
        if (!isRefundValid) return setState({ refundTried: true });

        setState({ dialog: "refund", refundFinal: refundAmount });
      },
      isPrimaryDisabled: !!overError,
    });

  if (state.view === "resend")
    setFooter({
      primaryLabel: "Send receipt",
      primaryRun: () => {
        if (!state.resendTo.trim()) return setState({ resendTried: true });

        showToast(`Receipt sent to ${state.resendTo.trim()}`);
        props.onResent?.(state.resendTo.trim());
        goTo("detail", -1);
      },
    });

  return {
    name,
    cardText,
    modeLabel,
    creditRows,
    isRefund,
    balanceLabel,
    balanceValue,
    isInCheckout,
    stepIndex,
    back,
    done,
    isOffPlatform,
    refundCapAll,
    refundCap,
    detail: { badges, panel, rows, total, links, actions, hasUndo },
    refund: { amount: refundAmount, error: refundError },
    review: { totalLabel: reviewTotalLabel, totalValue: reviewTotalValue },
    receipt,
    dialog,
    footer,
    leaveDone,
    refundNote: isRefund
      ? `${formatPounds(money.refundDue)} goes back to ${name}’s ${cardText} automatically when you complete checkout.`
      : "",
    linkTarget,
  };
};

export type CheckoutViewModel = ReturnType<typeof getCheckoutView>;

// The past booking sheet's values and actions, and the past checkout values.
import type {
  CheckoutBooking,
  CheckoutView,
  PaymentMode,
} from "../../components/checkout-sheet/checkout-data";
import type { CheckoutSheetProps } from "../../components/checkout-sheet/use-checkout";
import { PAST_TONE } from "./studio-data";
import { getAvatarSrc, parseAmountLabel, timeRange } from "./studio-format";
import {
  getClient,
  getPastKey,
  getPastRows,
  getServiceDuration,
  getWaiveConfirm,
} from "./studio-model";
import type { PastRecord, StudioState } from "./studio-types";
import type { StudioController } from "./use-studio";
import { roundToPence } from "../../utils/money";

const DAY_MS = 86400000;

interface PastCheckout {
  booking: CheckoutBooking;
  done: NonNullable<CheckoutSheetProps["done"]>;
  cap: number;
}

/** A past row in the shape CheckoutSheet takes, with what was charged. */
const getPastCheckout = (state: StudioState, row: PastRecord): PastCheckout => {
  const client = row.client ? getClient(state, row.client) : null;
  const { checkout } = row;
  const name = client?.name || "";

  const shared = {
    client: name || "Walk-in",
    first: (name || "your client").split(" ")[0] ?? "",
    service: row.service,
    meta: "",
    addons: [] as [string, number][],
    card: "4242",
    brand: "Visa",
    paidOn: "",
    phone: client?.phone || "",
    email: client?.email || "",
    day: row.when,
    time: timeRange(
      row.time,
      row.duration || getServiceDuration(state, row.service),
    ),
    arrived: "",
  };

  if (row.status !== "Completed") {
    const fee = parseAmountLabel(row.feeLabel);

    return {
      booking: {
        ...shared,
        price: fee,
        lines: [
          {
            name:
              row.status === "No show"
                ? "No-show fee"
                : "Late cancellation fee",
            subtitle: row.service,
            base: fee,
            adjustment: 0,
            reason: "",
          },
        ],
        mode: "card",
        paid: 0,
      },
      done: { method: "card", via: "", charged: fee, tip: 0, refundAuto: 0 },
      cap: fee,
    };
  }

  const paid = checkout
    ? checkout.paid
    : roundToPence((row.price * (state.policy.deposit || 20)) / 100);

  const lines = checkout?.lines
    ? checkout.lines
    : [
        {
          name: row.service,
          subtitle: row.duration || "",
          base: row.price,
          adjustment: 0,
          reason: "",
        },
      ];

  const done = checkout
    ? {
        method: checkout.method,
        via: checkout.via,
        charged: checkout.charged,
        tip: checkout.tip,
        refundAuto: checkout.refundAuto,
      }
    : {
        method: "card",
        via: "",
        charged: roundToPence(row.price - paid),
        tip: 0,
        refundAuto: 0,
      };

  if (row.linkPaid && done.method === "link") {
    done.method = "record";
    done.via = row.linkVia || "cash";
  }

  const platform = roundToPence(
    paid -
      (done.refundAuto || 0) +
      (done.method === "card" || done.method === "link" ? done.charged : 0),
  );

  const getCap = () => {
    if (platform > 0) return platform;

    return done.method === "record" ? done.charged : 0;
  };

  return {
    booking: {
      ...shared,
      price: row.price,
      lines,
      mode: (checkout ? checkout.mode : "deposit") as PaymentMode,
      paid,
    },
    done: done as PastCheckout["done"],
    cap: getCap(),
  };
};

const findPastRow = (studio: StudioController) => {
  const { state, isNew, seedPast } = studio;

  return getPastRows(state, isNew, seedPast).find(
    (row) => getPastKey(row) === state.selectedPastId,
  );
};

const getRefundTag = (refunded: number, left: number) => {
  if (refunded > 0)
    return left <= 0 ? "Refunded" : `Partially refunded £${refunded}`;

  return "";
};

export const getPastSheetView = (studio: StudioController) => {
  const { state, setState, actions, seedPast } = studio;
  const row = findPastRow(studio);

  if (!row) return null;

  const { policy } = state;
  const client = getClient(state, row.client);

  const tone = PAST_TONE[row.status] ?? {
    background: "",
    color: "",
    icon: null,
    meta: "",
  };

  const isCompleted = row.status === "Completed";
  const isFresh = !!row.at && Date.now() - row.at < DAY_MS;

  const hoursLeft = isFresh
    ? Math.max(1, Math.round((DAY_MS - (Date.now() - (row.at || 0))) / 3600000))
    : 0;

  const patch = (value: Parameters<typeof actions.patchPast>[1]) =>
    actions.patchPast(row.pastId, value, seedPast);

  const firstName = (fallback: string) =>
    (client.name || fallback).split(" ")[0] ?? "";

  let action: (() => void) | null = null;
  let actionLabel = "";
  let actionHint = "";
  const { original } = row;

  if (isFresh && row.status === "No show" && original) {
    actionLabel = "Undo no-show";
    actionHint = `Puts the booking back. Available for ${hoursLeft}h.`;

    action = () => {
      setState({
        bookings: state.bookings.concat([original]),
        pastNew: state.pastNew.filter(({ pastId }) => pastId !== row.pastId),
      });

      actions.closeSheet();
      actions.showToast("Booking restored");
    };
  }

  const isKept =
    (row.feeKept || row.feePending) && !row.waived && !row.feeUnpaid;

  const feeNumber = parseAmountLabel(row.feeLabel);
  const feeLeft = roundToPence(feeNumber - (row.refunded || 0));
  // the fee gets its own action so a no-show can offer both "Undo no-show" and "Waive fee"
  let feeAction: (() => void) | null = null;
  let feeActionLabel = "";

  if (isKept) {
    const pendingNote = row.feePending ? ` (applies in ${hoursLeft}h)` : "";

    feeActionLabel = isFresh
      ? `Waive ${row.feeLabel} fee${pendingNote}`
      : "Refund";

    const waiveFee = () => {
      setState({ confirm: null });

      patch((current) => ({
        waived: true,
        feePending: false,
        meta: isFresh ? "Fee waived" : "Refunded",
        note:
          (current.note || "").replace(
            / ?£[\d.]+ (deposit kept( as (a )?fee)?|charged)\.?/,
            "",
          ) +
          (isFresh ? " Fee waived, client refunded." : " Fee refunded later."),
      }));

      const refundLead = isFresh ? "Fee waived. " : "Refunded. ";
      const clientFirst = (client.name || "").split(" ")[0];

      actions.showToast(
        `${refundLead}${clientFirst} gets ${row.feeLabel} back`,
      );
    };

    if (isFresh)
      feeAction = () =>
        setState({
          confirm: getWaiveConfirm(state, row, client, isFresh, waiveFee),
        });
    else if (feeLeft > 0)
      feeAction = () => setState({ pastCheckoutPanel: "refund" });
  }

  // a pending/kept fee with an action collapses note + action into one panel
  const isMerged = isKept && !!feeAction;

  const unpaidFirst = firstName("the client");
  const isUnpaid = !!row.feeUnpaid && !row.waived;
  const tries = row.feeTries == null ? 1 : row.feeTries;

  const extra =
    Math.max(
      0,
      roundToPence(feeNumber - (row.price * (policy.deposit || 20)) / 100),
    ) || feeNumber;

  const settle = (value: Partial<PastRecord>, message: string) => {
    setState({ confirm: null });
    patch(value);
    actions.showToast(message);
  };

  const completed = (() => {
    if (!isCompleted)
      return {
        hasAwait: false,
        hasLinks: false,
        canRefund: false,
        refundTag: "",
        awaitBody: "",
        canCancelLink: false,
      };

    const checkout = getPastCheckout(state, row);
    const first = firstName("your client");
    const isAwaiting = checkout.done.method === "link";
    const refunded = row.refunded || 0;
    const left = roundToPence(checkout.cap - refunded);

    return {
      hasAwait: isAwaiting,
      awaitBody: `Payment link for £${checkout.done.charged} sent to ${first}. They can pay by card, Apple Pay or Google Pay, and add a tip.`,
      resendLink: () => actions.showToast(`Payment link resent to ${first}`),
      recordPaid: () =>
        setState({
          confirm: {
            title: `Record £${checkout.done.charged} as paid?`,
            body: "Recorded only, no money moves through Tiwára’s House.",
            yesLabel: "Record as paid",
            yes: () => {
              setState({ confirm: null });

              patch({
                linkPaid: true,
                linkVia: "cash",
                meta: "Paid · Recorded",
              });

              actions.showToast("Payment recorded");
            },
          },
        }),
      canCancelLink: isAwaiting && !!original,
      cancelLink: () =>
        setState({
          confirm: {
            title: "Cancel the payment link?",
            body: `${first} won’t be able to pay with it. The booking moves to Unpaid and back into Due for checkout.`,
            yesLabel: "Cancel link",
            yes: () => {
              if (!original) return;

              setState({
                confirm: null,
                bookings: state.bookings.concat([
                  { ...original, status: "arrived", checkoutUnpaid: true },
                ]),
                pastNew: state.pastNew.filter(
                  ({ pastId }) => pastId !== row.pastId,
                ),
              });

              actions.closeSheet();
              actions.showToast("Payment link cancelled");
            },
          },
        }),
      refundTag: getRefundTag(refunded, left),
      hasLinks: !isAwaiting,
      viewReceipt: () => setState({ pastCheckoutPanel: "receipt" }),
      resendReceipt: () => setState({ pastCheckoutPanel: "resend" }),
      canRefund: !isAwaiting && left > 0,
      openRefund: () => setState({ pastCheckoutPanel: "refund" }),
    };
  })();

  const hasFee = (row.feeKept || row.feePending) && !row.waived;

  const why =
    row.status === "No show"
      ? "They didn’t turn up."
      : `Cancelled inside your ${policy.window}h window.`;

  const phone = (client.phone || "").replace(/\s/g, "");

  const getSinceLabel = () => {
    if (!row.client) return "";

    if (client.since) return ` · client since ${client.since}`;

    return client.area ? ` · ${client.area}` : "";
  };

  const getActionTitle = () => {
    if (hasFee) {
      const feeKind =
        row.status === "No show" ? "no-show fee" : "late cancellation fee";

      return `${row.feeLabel} ${feeKind}`;
    }

    return actionLabel === "Undo no-show" ? "Marked as a no-show" : "";
  };

  const getOutLabel = () => {
    if (isCompleted || !isKept) return "Paid";

    return row.feePending && isFresh ? "Fee pending" : "Fee kept";
  };

  const getOutValue = () => {
    if (isCompleted) return `£${row.price}`;

    return isKept ? row.feeLabel : "£0";
  };

  const feeTiming =
    row.feePending && isFresh
      ? `Charged automatically in ${hoursLeft}h.`
      : "Kept from the deposit.";

  return {
    clientName: client.name || "Walk-in",
    imgSrc: getAvatarSrc(client),
    visitLabel: row.client
      ? (client.visits || 0) + (client.visits === 1 ? " visit" : " visits")
      : "Walk-in",
    sinceLabel: getSinceLabel(),
    hasPhone: !!client.phone,
    hasEmail: !!client.email,
    hasContact: !!(client.phone || client.email),
    telHref: `tel:${phone}`,
    smsHref: `sms:${phone}`,
    mailHref: `mailto:${client.email || ""}`,
    canOpen: !!row.client,
    openClient: () => {
      if (row.client)
        actions.openSheet("cliView", {
          selectedClientId: row.client,
          clientFromPastId: state.selectedPastId,
        });
    },
    service: row.service,
    when: row.when,
    time: timeRange(
      row.time,
      row.duration || getServiceDuration(state, row.service),
    ),
    priceLabel: `£${row.price}`,
    isStruck: !isCompleted,
    note: row.note || "",
    hasNote: !!row.note && !isMerged,
    hasAction: !!action,
    actionHasText: !isMerged,
    feeMerge: isMerged,
    feeAction,
    feeActionLabel,
    feeReason:
      (row.note || why) +
      (row.feePending && isFresh
        ? ` Charged automatically in ${hoursLeft}h unless you waive it.`
        : ""),
    feeUnpaid: isUnpaid,
    feeUnpaidTitle: "Card declined: insufficient funds",
    feeUnpaidBody: `£${extra} of ${unpaidFirst}’s ${row.feeLabel} fee couldn’t be charged to Visa •••• 4242.`,
    feeUnpaidRetryShown: tries > 0,
    feeUnpaidRetryLabel: `Retry card (${tries} of 2 left)`,
    feeUnpaidRetry: () =>
      setState({
        confirm: {
          title: `Charge £${extra} to ${unpaidFirst}’s card ending 4242?`,
          body:
            tries === 1
              ? "This uses your last retry. If it’s declined again, send a payment link or record the payment instead."
              : `You have ${tries} retries left.`,
          yesLabel: `Charge £${extra}`,
          yes: () => {
            if ((studio.props.cardDeclines || "none") !== "none")
              settle({ feeTries: tries - 1 }, "Card declined again");
            else
              settle(
                {
                  feeUnpaid: false,
                  feePending: false,
                  meta: "Fee collected",
                  at: Date.now() - 2 * DAY_MS,
                },
                `£${extra} charged`,
              );
          },
        },
      }),
    feeUnpaidLink: () => {
      patch({ meta: "Fee link sent" });
      actions.showToast(`Payment link for £${extra} sent to ${unpaidFirst}`);
    },
    feeUnpaidRecord: () =>
      setState({
        confirm: {
          title: `Record £${extra} as paid?`,
          body: "Recorded only, no money moves through Tiwára’s House.",
          yesLabel: "Record as paid",
          yes: () =>
            settle(
              {
                feeUnpaid: false,
                feePending: false,
                meta: "Fee recorded",
                at: Date.now() - 2 * DAY_MS,
              },
              "Payment recorded",
            ),
        },
      }),
    feeUnpaidWaive: () =>
      setState({
        confirm: getWaiveConfirm(state, row, client, true, () =>
          settle(
            {
              waived: true,
              feeUnpaid: false,
              feePending: false,
              meta: "Fee waived",
            },
            "Fee waived",
          ),
        ),
      }),
    feeRefundTag: isCompleted ? "" : getRefundTag(row.refunded || 0, feeLeft),
    ...completed,
    action,
    actionLabel,
    actionTitle: getActionTitle(),
    actionReason: hasFee ? `${why} ${feeTiming}` : actionHint,
    status: row.status,
    badgeBackground: tone.background,
    badgeColor: tone.color,
    badgeIcon: tone.icon,
    totalLabel: `£${row.price}`,
    outLabel: getOutLabel(),
    outValue: getOutValue(),
    canRebook: !!row.client,
    rebook: () =>
      actions.rebookFrom({
        service: row.service,
        client: row.client,
        price: row.price,
      }),
  };
};

export type PastSheetView = NonNullable<ReturnType<typeof getPastSheetView>>;

/** CheckoutSheet's receipt / resend / refund over the past sheet. */
export const getPastCheckoutView = (studio: StudioController) => {
  const { state, setState, actions, seedPast } = studio;

  if (state.sheet !== "past" || !state.pastCheckoutPanel) return null;

  const row = findPastRow(studio);

  if (!row) return null;

  const { booking, done } = getPastCheckout(state, row);
  const back = () => setState({ pastCheckoutPanel: null });

  return {
    booking,
    start: state.pastCheckoutPanel as CheckoutView,
    done,
    refunded: row.refunded || 0,
    onExit: back,
    onComplete: back,
    onRefund: (amount: number, reason: string) =>
      actions.patchPast(
        row.pastId,
        (current) => ({
          refunded: roundToPence((current.refunded || 0) + amount),
          refundReason: reason,
        }),
        seedPast,
      ),
  };
};

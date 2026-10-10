// The past booking sheet's values and actions (prototype renderVals pastS, pastCkOf and the past checkout values).
import type {
  CheckoutBooking,
  CheckoutView,
  PaymentMode,
} from "../../components/checkout-sheet/checkout-data";
import type { CheckoutSheetProps } from "../../components/checkout-sheet/use-checkout";
import { PAST_TONE } from "./studio-data";
import { getAvatarSrc, timeRange } from "./studio-format";
import {
  getClient,
  getPastKey,
  getPastRows,
  getServiceDur,
  getWaiveConfirm,
} from "./studio-model";
import type { PastRecord, StudioState } from "./studio-types";
import type { StudioController } from "./use-studio";

const DAY_MS = 86400000;
const roundMoney = (value: number) => Math.round(value * 100) / 100;
const toNumber = (value: unknown) =>
  parseFloat(String(value || "").replace(/[^0-9.]/g, "")) || 0;

export interface PastCheckout {
  booking: CheckoutBooking;
  done: NonNullable<CheckoutSheetProps["done"]>;
  cap: number;
}

/** A past row in the shape CheckoutSheet takes, with what was charged (prototype pastCkOf). */
export const getPastCheckout = (
  state: StudioState,
  row: PastRecord,
): PastCheckout => {
  const client = row.client ? getClient(state, row.client) : null;
  const { ck } = row;
  const name = client?.name || "";
  const shared = {
    client: name || "Walk-in",
    first: (name || "your client").split(" ")[0] ?? "",
    svc: row.svc,
    meta: "",
    addons: [] as [string, number][],
    card: "4242",
    brand: "Visa",
    paidOn: "",
    phone: client?.phone || "",
    email: client?.email || "",
    day: row.when,
    time: timeRange(row.time, row.dur || getServiceDur(state, row.svc)),
    arrived: "",
  };
  if (row.status !== "Completed") {
    const fee = toNumber(row.feeLabel);
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
            sub: row.svc,
            base: fee,
            adj: 0,
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
  const paid = ck
    ? ck.paid
    : roundMoney(
        (row.price * (parseFloat(String(state.policy.deposit)) || 20)) / 100,
      );
  const lines = ck?.lines
    ? ck.lines
    : [
        {
          name: row.svc,
          sub: row.dur || "",
          base: row.price,
          adj: 0,
          reason: "",
        },
      ];
  const done = ck
    ? {
        method: ck.method,
        via: ck.via,
        charged: ck.charged,
        tip: ck.tip,
        refundAuto: ck.refundAuto,
      }
    : {
        method: "card",
        via: "",
        charged: roundMoney(row.price - paid),
        tip: 0,
        refundAuto: 0,
      };
  if (row.linkPaid && done.method === "link") {
    done.method = "record";
    done.via = row.linkVia || "cash";
  }
  const platform = roundMoney(
    paid -
      (done.refundAuto || 0) +
      (done.method === "card" || done.method === "link" ? done.charged : 0),
  );
  return {
    booking: {
      ...shared,
      price: row.price,
      lines,
      mode: (ck ? ck.mode : "deposit") as PaymentMode,
      paid,
    },
    done: done as PastCheckout["done"],
    cap: platform > 0 ? platform : done.method === "record" ? done.charged : 0,
  };
};

const findPastRow = (studio: StudioController) => {
  const { state, isNew, seedPast } = studio;
  return getPastRows(state, isNew, seedPast).find(
    (row) => getPastKey(row) === state.pastSel,
  );
};

/** The past booking sheet (prototype pastS). */
export const getPastSheetView = (studio: StudioController) => {
  const { state, setState, actions, seedPast } = studio;
  const row = findPastRow(studio);
  if (!row) return null;
  const { policy } = state;
  const client = getClient(state, row.client);
  const tone = PAST_TONE[row.status] ?? {
    bg: "",
    color: "",
    icon: "",
    meta: "",
  };
  const isOk = row.status === "Completed";
  const isFresh = !!row.at && Date.now() - row.at < DAY_MS;
  const hoursLeft = isFresh
    ? Math.max(1, Math.round((DAY_MS - (Date.now() - (row.at || 0))) / 3600000))
    : 0;
  const patch = (value: Parameters<typeof actions.patchPast>[1]) =>
    actions.patchPast(row.pid, value, seedPast);
  const firstName = (fallback: string) =>
    (client.name || fallback).split(" ")[0] ?? "";

  let act: (() => void) | null = null;
  let actLabel = "";
  let actHint = "";
  const { orig } = row;
  if (isFresh && row.status === "No show" && orig) {
    actLabel = "Undo no-show";
    actHint = "Puts the booking back. Available for " + hoursLeft + "h.";
    act = () => {
      setState({
        bookings: state.bookings.concat([orig]),
        pastNew: state.pastNew.filter(({ pid }) => pid !== row.pid),
      });
      actions.closeSheet();
      actions.toastMsg("Booking restored");
    };
  }

  const isKept =
    (row.feeKept || row.feePending) && !row.waived && !row.feeUnpaid;
  const feeNumber = toNumber(row.feeLabel);
  const feeLeft = roundMoney(feeNumber - (row.refunded || 0));
  // the fee gets its own action so a no-show can offer both "Undo no-show" and "Waive fee"
  let feeAct: (() => void) | null = null;
  let feeActLabel = "";
  if (isKept) {
    feeActLabel = isFresh
      ? "Waive " +
        row.feeLabel +
        " fee" +
        (row.feePending ? " (applies in " + hoursLeft + "h)" : "")
      : "Refund";
    const doFee = () => {
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
      actions.toastMsg(
        (isFresh ? "Fee waived. " : "Refunded. ") +
          (client.name || "").split(" ")[0] +
          " gets " +
          row.feeLabel +
          " back",
      );
    };
    feeAct = isFresh
      ? () =>
          setState({
            confirm: getWaiveConfirm(state, row, client, isFresh, doFee),
          })
      : feeLeft > 0
        ? () => setState({ pastCk: "refund" })
        : null;
  }
  // a pending/kept fee with an action collapses note + action into one panel
  const isMerged = isKept && !!feeAct;

  const unpaidFirst = firstName("the client");
  const isUnpaid = !!row.feeUnpaid && !row.waived;
  const tries = row.feeTries == null ? 1 : row.feeTries;
  const extra =
    Math.max(
      0,
      roundMoney(
        feeNumber -
          (row.price * (parseFloat(String(policy.deposit)) || 20)) / 100,
      ),
    ) || feeNumber;
  const settle = (value: Partial<PastRecord>, message: string) => {
    setState({ confirm: null });
    patch(value);
    actions.toastMsg(message);
  };

  const completed = (() => {
    if (!isOk)
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
    const left = roundMoney(checkout.cap - refunded);
    return {
      hasAwait: isAwaiting,
      awaitBody:
        "Payment link for £" +
        checkout.done.charged +
        " sent to " +
        first +
        ". They can pay by card, Apple Pay or Google Pay, and add a tip.",
      resendLink: () => actions.toastMsg("Payment link resent to " + first),
      recordPaid: () =>
        setState({
          confirm: {
            title: "Record £" + checkout.done.charged + " as paid?",
            body: "Recorded only, no money moves through Tiwára’s House.",
            yesLabel: "Record as paid",
            yes: () => {
              setState({ confirm: null });
              patch({
                linkPaid: true,
                linkVia: "cash",
                meta: "Paid · Recorded",
              });
              actions.toastMsg("Payment recorded");
            },
          },
        }),
      canCancelLink: isAwaiting && !!orig,
      cancelLink: () =>
        setState({
          confirm: {
            title: "Cancel the payment link?",
            body:
              first +
              " won’t be able to pay with it. The booking moves to Unpaid and back into Due for checkout.",
            yesLabel: "Cancel link",
            yes: () => {
              if (!orig) return;
              setState({
                confirm: null,
                bookings: state.bookings.concat([
                  { ...orig, status: "arrived", ckUnpaid: true },
                ]),
                pastNew: state.pastNew.filter(({ pid }) => pid !== row.pid),
              });
              actions.closeSheet();
              actions.toastMsg("Payment link cancelled");
            },
          },
        }),
      refundTag:
        refunded > 0
          ? left <= 0
            ? "Refunded"
            : "Partially refunded £" + refunded
          : "",
      hasLinks: !isAwaiting,
      viewReceipt: () => setState({ pastCk: "receipt" }),
      resendReceipt: () => setState({ pastCk: "resend" }),
      canRefund: !isAwaiting && left > 0,
      openRefund: () => setState({ pastCk: "refund" }),
    };
  })();

  const hasFee = (row.feeKept || row.feePending) && !row.waived;
  const why =
    row.status === "No show"
      ? "They didn’t turn up."
      : "Cancelled inside your " + policy.window + "h window.";
  const phone = (client.phone || "").replace(/\s/g, "");
  return {
    clientName: client.name || "Walk-in",
    imgSrc: getAvatarSrc(client),
    visitLabel: row.client
      ? (client.visits || 0) + (client.visits === 1 ? " visit" : " visits")
      : "Walk-in",
    sinceLabel: row.client
      ? client.since
        ? " · client since " + client.since
        : client.area
          ? " · " + client.area
          : ""
      : "",
    hasPhone: !!client.phone,
    hasEmail: !!client.email,
    hasContact: !!(client.phone || client.email),
    telHref: "tel:" + phone,
    smsHref: "sms:" + phone,
    mailHref: "mailto:" + (client.email || ""),
    canOpen: !!row.client,
    openClient: () => {
      if (row.client)
        actions.openSheet("cliView", {
          cliSel: row.client,
          cFromP: state.pastSel,
        });
    },
    svc: row.svc,
    when: row.when,
    time: timeRange(row.time, row.dur || getServiceDur(state, row.svc)),
    priceLabel: "£" + row.price,
    isStruck: !isOk,
    note: row.note || "",
    hasNote: !!row.note && !isMerged,
    hasAct: !!act,
    actHasText: !isMerged,
    feeMerge: isMerged,
    feeAct,
    feeActLabel,
    feeReason:
      (row.note || why) +
      (row.feePending && isFresh
        ? " Charged automatically in " + hoursLeft + "h unless you waive it."
        : ""),
    feeUnpaid: isUnpaid,
    fuTitle: "Card declined: insufficient funds",
    fuBody:
      "£" +
      extra +
      " of " +
      unpaidFirst +
      "’s " +
      row.feeLabel +
      " fee couldn’t be charged to Visa •••• 4242.",
    fuRetryShow: tries > 0,
    fuRetryLabel: "Retry card (" + tries + " of 2 left)",
    fuRetry: () =>
      setState({
        confirm: {
          title:
            "Charge £" + extra + " to " + unpaidFirst + "’s card ending 4242?",
          body:
            tries === 1
              ? "This uses your last retry. If it’s declined again, send a payment link or record the payment instead."
              : "You have " + tries + " retries left.",
          yesLabel: "Charge £" + extra,
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
                "£" + extra + " charged",
              );
          },
        },
      }),
    fuLink: () => {
      patch({ meta: "Fee link sent" });
      actions.toastMsg(
        "Payment link for £" + extra + " sent to " + unpaidFirst,
      );
    },
    fuRecord: () =>
      setState({
        confirm: {
          title: "Record £" + extra + " as paid?",
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
    fuWaive: () =>
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
    feeRefundTag:
      !isOk && (row.refunded || 0) > 0
        ? feeLeft <= 0
          ? "Refunded"
          : "Partially refunded £" + row.refunded
        : "",
    ...completed,
    act,
    actLabel,
    actTitle: hasFee
      ? row.feeLabel +
        " " +
        (row.status === "No show" ? "no-show fee" : "late cancellation fee")
      : actLabel === "Undo no-show"
        ? "Marked as a no-show"
        : "",
    actWhy: hasFee
      ? why +
        " " +
        (row.feePending && isFresh
          ? "Charged automatically in " + hoursLeft + "h."
          : "Kept from the deposit.")
      : actHint,
    status: row.status,
    badgeBg: tone.bg,
    badgeColor: tone.color,
    badgeIcon: tone.icon,
    totalLabel: "£" + row.price,
    outLabel: isOk
      ? "Paid"
      : isKept
        ? row.feePending && isFresh
          ? "Fee pending"
          : "Fee kept"
        : "Paid",
    outValue: isOk ? "£" + row.price : isKept ? row.feeLabel : "£0",
    canRebook: !!row.client,
    rebook: () =>
      actions.rebookFrom({
        svc: row.svc,
        client: row.client,
        price: row.price,
      }),
  };
};

export type PastSheetView = NonNullable<ReturnType<typeof getPastSheetView>>;

/** CheckoutSheet's receipt / resend / refund over the past sheet (prototype ckBooking … onCkRefund for pastCk). */
export const getPastCheckoutView = (studio: StudioController) => {
  const { state, setState, actions, seedPast } = studio;
  if (state.sheet !== "past" || !state.pastCk) return null;
  const row = findPastRow(studio);
  if (!row) return null;
  const { booking, done } = getPastCheckout(state, row);
  const back = () => setState({ pastCk: null });
  return {
    booking,
    start: state.pastCk as CheckoutView,
    done,
    refunded: row.refunded || 0,
    onExit: back,
    onComplete: back,
    onRefund: (amount: number, reason: string) =>
      actions.patchPast(
        row.pid,
        (current) => ({
          refunded: roundMoney((current.refunded || 0) + amount),
          refundReason: reason,
        }),
        seedPast,
      ),
  };
};

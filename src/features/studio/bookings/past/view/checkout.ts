import type {
  CheckoutBooking,
  PaymentMode,
} from "../../../../../components/checkout/data";
import type { CheckoutSheetProps } from "../../../../../components/checkout/use-checkout";
import { parseAmountLabel, timeRange } from "../../../core/format";
import {
  getClient,
  getPastKey,
  getPastRows,
  getServiceDuration,
} from "../../../core/model";
import type { PastRecord, StudioState } from "../../../core/types";
import type { StudioController } from "../../../core/use-studio";
import { roundToPence } from "../../../../../utils/money";

interface PastCheckout {
  booking: CheckoutBooking;
  done: NonNullable<CheckoutSheetProps["done"]>;
  cap: number;
}

export const getPastTime = (state: StudioState, row: PastRecord) =>
  timeRange(row.time, row.duration || getServiceDuration(state, row.service));

const getFeeCheckout = (
  row: PastRecord,
  shared: Omit<CheckoutBooking, "price" | "lines" | "mode" | "paid">,
): PastCheckout => {
  const fee = parseAmountLabel(row.feeLabel);

  return {
    booking: {
      ...shared,
      price: fee,
      lines: [
        {
          name:
            row.status === "No show" ? "No-show fee" : "Late cancellation fee",
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
};

/** A past row in the shape CheckoutSheet takes, with what was charged. */
export const getPastCheckout = (
  state: StudioState,
  row: PastRecord,
): PastCheckout => {
  const client = row.client ? getClient(state, row.client) : null;
  const { checkout } = row;
  const name = client?.name || "";

  const shared = {
    client: name || "Walk-in",
    first: (name || "your client").split(" ")[0] ?? "",
    service: row.service,
    meta: "",
    addons: [] as [string, number][],
    ...(row.remoteId
      ? { card: "saved", brand: "", cardLabel: row.cardLabel ?? "Saved card" }
      : { card: "4242", brand: "Visa" }),
    paidOn: "",
    phone: client?.phone || "",
    email: client?.email || "",
    day: row.when,
    time: getPastTime(state, row),
    arrived: "",
  };

  if (row.status !== "Completed") return getFeeCheckout(row, shared);

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

export const findPastRow = (studio: StudioController) => {
  const { state, seedPast } = studio;

  return getPastRows(state, seedPast).find(
    (row) => getPastKey(row) === state.selectedPastId,
  );
};

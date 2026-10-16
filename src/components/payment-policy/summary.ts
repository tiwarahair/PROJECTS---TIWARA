import type { Policy } from "../../types/policy";
import type { FeeValues, PolicyExtra, PolicyFormValues } from "./types";
import { getPercent } from "./values";

export const EXTRAS_LIMIT = 300;
/** The client preview's example service price. */
export const PREVIEW_PRICE = 100;

export const getExtrasUsed = (extras: PolicyExtra[]): number => {
  let used = 0;

  for (const { text } of extras) used += text.length;

  return used;
};

/** The policy as the client-facing builder (utils/pricing policyLines) reads it, for a £100 example. */
export const getPreviewPolicy = (state: PolicyFormValues): Policy => {
  const deposit = parseInt(state.deposit, 10);

  return {
    mode: state.mode,
    depositPercent: isNaN(deposit) ? 0 : Math.min(deposit, 100),
    refundable: state.refundable,
    freeWindowHours: state.freeWindowHours,
    late: {
      on: state.late.on,
      kind: state.late.kind,
      percent: getPercent(state.late),
    },
    noShow: {
      on: state.noShow.on,
      kind: state.noShow.kind,
      percent: getPercent(state.noShow),
    },
    graceMinutes: state.grace,
    extras: [],
  };
};

const getWindowText = (hours: number): string => {
  if (hours < 1) return "30 mins";

  return hours === 1 ? "1 hour" : `${hours}h`;
};

const getExistingBookingsText = (bookingsCount: number): string => {
  if (bookingsCount === 0) return "";

  if (bookingsCount === 1)
    return " Your 1 existing booking keeps its current policy.";

  return ` Your ${bookingsCount} existing bookings keep their current policy.`;
};

/** "20% deposit, free cancellation until 48h before, …" for the save bar. */
export const getPolicySummary = (state: PolicyFormValues): string => {
  const { mode, refundable, freeWindowHours, late, noShow } = state;
  const deposit = parseInt(state.deposit, 10);
  const windowText = getWindowText(freeWindowHours);
  const depositValue = isNaN(deposit) ? 0 : deposit;
  const refundNote = refundable ? "" : ", non-refundable";

  const parts = [
    {
      deposit: `${depositValue}% deposit${refundNote}`,
      full: "Full payment upfront",
      card: "Card saved at booking",
      none: "No protection",
    }[mode],
  ];

  parts.push(
    mode === "none"
      ? `cancel by ${windowText} before`
      : `free cancellation until ${windowText} before`,
  );

  if (mode !== "none") {
    const describe = (fee: FeeValues) => {
      if (!fee.on) return null;

      return mode === "deposit" && fee.kind === "keep"
        ? "deposit"
        : `${getPercent(fee)}%`;
    };

    const lateText = describe(late);
    const noShowText = describe(noShow);

    if (lateText && lateText === noShowText)
      parts.push(
        lateText === "deposit"
          ? "deposit kept for late cancellations and no-shows"
          : `${lateText} late cancellation and no-show fees`,
      );
    else {
      if (lateText)
        parts.push(
          lateText === "deposit"
            ? "deposit kept for late cancellations"
            : `${lateText} late cancellation fee`,
        );

      if (noShowText)
        parts.push(
          noShowText === "deposit"
            ? "deposit kept for no-shows"
            : `${noShowText} no-show fee`,
        );

      if (!lateText && !noShowText) parts.push("no fees");
    }
  }

  return parts.join(", ").replace(/^./, (first) => first.toUpperCase());
};

/** "This applies to new bookings only. Your 14 existing bookings keep …" */
export const getExistingNote = (bookingsCount = 14): string =>
  `This applies to new bookings only.${getExistingBookingsText(bookingsCount)}`;

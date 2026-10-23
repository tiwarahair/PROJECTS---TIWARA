import {
  recordFeePaid,
  resendPaymentLink,
  retryFee,
  waiveFee,
} from "../../../../../lib/studio-api/money";
import { SaveError } from "../../../../../lib/studio-writes";
import { getWaiveConfirm } from "../../../core/model";
import { formatMoney, roundToPence } from "../../../../../utils/money";
import { DAY_MS, RECORDED_ONLY } from "./context";
import type { PastRecord } from "../../../core/types";
import type { PastContext } from "./context";

/** A real fee was emailed a link already, which can be resent twice. */
const getLinkLabel = ({ feeLinkResends: resends = 0 }: PastRecord) =>
  resends ? `Resend link (${resends} left)` : "No resends left";

export const getUnpaidView = ({
  state,
  setState,
  actions,
  row,
  client,
  feeNumber,
  patch,
  settle,
  saveFee,
  firstName,
}: PastContext) => {
  const unpaidFirst = firstName("the client");
  const tries = row.feeTries == null ? 1 : row.feeTries;
  const card = row.feeCard ?? "saved card";

  const extra =
    row.feeCharge ??
    (Math.max(
      0,
      roundToPence(feeNumber - (row.price * state.policy.deposit) / 100),
    ) ||
      feeNumber);

  const amount = formatMoney(extra, { pence: "always" });

  const collected = (meta: string) => ({
    feeUnpaid: false,
    feePending: false,
    meta,
    at: Date.now() - 2 * DAY_MS,
  });

  const chargeAgain = async (bookingId: string) => {
    setState({ confirm: null });

    try {
      const { outcome } = await retryFee(bookingId);

      if (outcome === "paid")
        settle(collected("Fee paid"), `${amount} charged`);
      else settle({ feeTries: tries - 1 }, "Card declined again");
    } catch (error) {
      actions.showToast(
        error instanceof SaveError
          ? error.message
          : "We couldn’t reach the card. Try again later.",
      );
    }
  };

  return {
    feeUnpaid: !!row.feeUnpaid && !row.waived,
    feeUnpaidTitle: "Card declined",
    feeUnpaidBody: `${amount} of ${unpaidFirst}’s ${row.feeLabel} fee couldn’t be charged to ${card}.`,
    feeUnpaidRetryShown: tries > 0,
    feeUnpaidRetryLabel: `Retry card (${tries} of 2 left)`,
    feeUnpaidRetry: () =>
      setState({
        confirm: {
          title: `Charge ${amount} to ${unpaidFirst}’s ${card}?`,
          body:
            tries === 1
              ? "This uses your last retry. If it’s declined again, send a payment link or record the payment instead."
              : `You have ${tries} retries left.`,
          yesLabel: `Charge ${amount}`,
          yes: () => void chargeAgain(row.remoteId),
        },
      }),
    feeUnpaidLinkLabel: getLinkLabel(row),
    isFeeUnpaidLinkOff: !row.feeLinkResends,
    feeUnpaidLink: () => {
      const resends = row.feeLinkResends ?? 0;

      if (!resends) return;

      const previous = state.pastNew;

      patch({ meta: "Fee link sent", feeLinkResends: resends - 1 });
      actions.showToast(`Payment link for ${amount} sent to ${unpaidFirst}`);
      saveFee(resendPaymentLink, previous);
    },
    feeUnpaidRecord: () =>
      setState({
        confirm: {
          title: `Record ${amount} as paid?`,
          body: RECORDED_ONLY,
          yesLabel: "Record as paid",
          yes: () => {
            const previous = state.pastNew;

            settle(collected("Fee recorded"), "Payment recorded");
            saveFee(recordFeePaid, previous);
          },
        },
      }),
    feeUnpaidWaive: () =>
      setState({
        confirm: getWaiveConfirm(state, row, client, true, () => {
          const previous = state.pastNew;

          settle(
            {
              waived: true,
              feeUnpaid: false,
              feePending: false,
              meta: "Fee waived",
            },
            "Fee waived",
          );

          saveFee(waiveFee, previous);
        }),
      }),
  };
};

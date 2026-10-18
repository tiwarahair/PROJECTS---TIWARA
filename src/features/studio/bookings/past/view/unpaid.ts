import {
  recordFeePaid,
  retryFee,
  waiveFee,
} from "../../../../../lib/studio-api";
import { SaveError } from "../../../../../lib/studio-writes";
import { getWaiveConfirm } from "../../../core/model";
import { roundToPence } from "../../../../../utils/money";
import { DAY_MS, RECORDED_ONLY } from "./context";
import type { PastContext } from "./context";

export const getUnpaidView = ({
  studio,
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
  const card = row.feeCard ?? "Visa •••• 4242";

  const extra =
    row.feeCharge ??
    (Math.max(
      0,
      roundToPence(
        feeNumber - (row.price * (state.policy.deposit || 20)) / 100,
      ),
    ) ||
      feeNumber);

  const collected = (meta: string) => ({
    feeUnpaid: false,
    feePending: false,
    meta,
    at: Date.now() - 2 * DAY_MS,
  });

  // demo boards say how the card behaves; a real fee is charged now
  const chargeDemo = () => {
    if ((studio.props.cardDeclines || "none") !== "none")
      settle({ feeTries: tries - 1 }, "Card declined again");
    else settle(collected("Fee collected"), `£${extra} charged`);
  };

  const chargeAgain = async (bookingId: string) => {
    setState({ confirm: null });

    try {
      const { outcome } = await retryFee(bookingId);

      if (outcome === "paid")
        settle(collected("Fee paid"), `£${extra} charged`);
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
    feeUnpaidTitle: row.remoteId
      ? "Card declined"
      : "Card declined: insufficient funds",
    feeUnpaidBody: `£${extra} of ${unpaidFirst}’s ${row.feeLabel} fee couldn’t be charged to ${card}.`,
    feeUnpaidRetryShown: tries > 0,
    feeUnpaidRetryLabel: `Retry card (${tries} of 2 left)`,
    feeUnpaidRetry: () =>
      setState({
        confirm: {
          title: `Charge £${extra} to ${unpaidFirst}’s ${card}?`,
          body:
            tries === 1
              ? "This uses your last retry. If it’s declined again, send a payment link or record the payment instead."
              : `You have ${tries} retries left.`,
          yesLabel: `Charge £${extra}`,
          yes: () => {
            const { remoteId } = row;

            if (remoteId) void chargeAgain(remoteId);
            else chargeDemo();
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

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
  firstName,
}: PastContext) => {
  const unpaidFirst = firstName("the client");
  const tries = row.feeTries == null ? 1 : row.feeTries;

  const extra =
    Math.max(
      0,
      roundToPence(
        feeNumber - (row.price * (state.policy.deposit || 20)) / 100,
      ),
    ) || feeNumber;

  const collected = (meta: string) => ({
    feeUnpaid: false,
    feePending: false,
    meta,
    at: Date.now() - 2 * DAY_MS,
  });

  return {
    feeUnpaid: !!row.feeUnpaid && !row.waived,
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
            else settle(collected("Fee collected"), `£${extra} charged`);
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
          yes: () => settle(collected("Fee recorded"), "Payment recorded"),
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
  };
};

// Stripe Connect from Studio: onboarding, the Express dashboard, and catching up after Stripe sends them back.
import { FunctionsHttpError } from "@supabase/supabase-js";
import { callStripe } from "../../../../lib/studio-api";
import type { StudioContext } from "../../core/actions";
import { hasTwoFactor } from "../../core/model";
import { getPayoutStatus } from "../../core/records";
import type { TwoFactorFlow } from "../../core/types";

interface StripeActionTools {
  showToast: (text: string) => void;
  openTwoFactor: (step: string, extra?: Partial<TwoFactorFlow>) => void;
}

export const createStripeActions = (
  { getState, setState, memo }: StudioContext,
  { showToast, openTwoFactor }: StripeActionTools,
) => {
  /** Opens a Stripe link; a lapsed 30-day 2FA asks for an app code first, then tries again. */
  const goToStripe = async (action: "onboard" | "dashboard") => {
    if (getState().stripeBusy) return;

    setState({ stripeBusy: true });

    try {
      const { url = "" } = await callStripe(action);

      window.location.assign(url);
    } catch (error) {
      setState({ stripeBusy: false });

      if (error instanceof FunctionsHttpError && error.context.status === 403) {
        if (!hasTwoFactor(getState())) return openTwoFactor("secure");

        openTwoFactor("taxcode", { flow: "info", from: "stripe" });
        memo.afterSecondFactor = () => void goToStripe(action);

        return;
      }

      showToast("Stripe couldn’t be opened. Try again.");
    }
  };

  /** Back from Stripe (?stripe=return), or its link expired (?stripe=refresh). */
  const catchUpWithStripe = async (reason: string) => {
    if (reason === "refresh") return goToStripe("onboard");

    try {
      const account = await callStripe("refresh");
      const isPaid = !!account.charges_enabled && !!account.payouts_enabled;

      setState(({ check }) => ({
        check: { ...check, stripe: isPaid },
        payoutStatus: getPayoutStatus(account),
        payoutBank: account.payout_bank ?? null,
      }));

      showToast(
        isPaid
          ? "Stripe connected. You can take payments"
          : "Stripe is checking your details",
      );
    } catch {
      showToast(
        "Stripe is still checking your details. This can take a few minutes.",
      );
    }
  };

  return {
    startStripe: () => goToStripe("onboard"),
    openStripeDashboard: () => goToStripe("dashboard"),
    catchUpWithStripe,
  };
};

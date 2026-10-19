// Tax details from Studio: editing needs a recent app code; a save that needs one asks, then saves again.
import { FunctionsHttpError } from "@supabase/supabase-js";
import type { TaxDetails } from "../../../../components/tax-details-form/logic";
import { saveTaxDetails } from "../../../../lib/studio-api/settings";
import {
  hasRecentSecondFactor,
  verifySecondFactor,
} from "../../../../lib/two-factor";
import type { StudioContext } from "../../core/actions";
import type { createTwoFactorActions } from "../two-factor/actions";

interface TaxActionTools {
  showToast: (text: string) => void;
  checkDone: () => void;
  twoFactor: ReturnType<typeof createTwoFactorActions>;
}

export const createTaxActions = (
  { getState, setState, memo }: StudioContext,
  { showToast, checkDone, twoFactor }: TaxActionTools,
) => {
  const { openTwoFactor, closeTwoFactor, withCode } = twoFactor;
  const isReal = () => !!getState().account;

  /** Tax details need an app code from the last 30 days; within that, no code is asked for. */
  const openTaxEdit = async () => {
    memo.afterSecondFactor = undefined;

    if (isReal() && (await hasRecentSecondFactor().catch(() => false)))
      return setState({ taxEdit: true });

    openTwoFactor("taxcode", { flow: "info" });
  };

  /** Saves tax details (encrypted on the server for a real account). */
  const saveTax = async (value: TaxDetails, onSaved?: () => void) => {
    try {
      const tax = isReal()
        ? {
            ...value,
            nationalInsuranceNumber: "",
            nationalInsuranceHint: await saveTaxDetails(value),
          }
        : value;

      setState({ tax });
      showToast("Tax details saved");
      checkDone();
      onSaved?.();
    } catch (error) {
      const isLapsed =
        error instanceof FunctionsHttpError && error.context.status === 403;

      if (!isLapsed)
        return showToast("Your tax details couldn’t be saved. Try again.");

      showToast("For your security, enter a code from your authenticator app.");
      openTwoFactor("taxcode", { flow: "info" });
      memo.afterSecondFactor = () => void saveTax(value, onSaved);
    }
  };

  const confirmTaxCode = () =>
    withCode(
      (code) => verifySecondFactor(code),
      () => {
        const next = memo.afterSecondFactor;

        closeTwoFactor();

        if (next) next();
        else setState({ taxEdit: true });
      },
    );

  return { openTaxEdit, saveTax, confirmTaxCode };
};

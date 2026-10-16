import { z } from "zod";
import type { PolicyMode } from "../../types/policy";
import type { FeeValues, PolicyFormValues } from "./types";

export const getDepositError = ({
  mode,
  deposit: depositInput,
  refundable,
}: PolicyFormValues): string => {
  if (mode !== "deposit") return "";

  const deposit = parseInt(depositInput, 10);

  if (isNaN(deposit) || deposit < 1) return "Enter a deposit of at least 1%.";

  if (deposit > (refundable ? 50 : 25))
    return refundable
      ? "Refundable deposits can be up to 50%."
      : "Non-refundable deposits can be up to 25%. Lower it or make it refundable.";

  return "";
};

export const getFeeError = (mode: PolicyMode, fee: FeeValues): string => {
  if (mode === "none" || !fee.on || (mode === "deposit" && fee.kind === "keep"))
    return "";

  const value = parseInt(fee.percent, 10);

  return isNaN(value) || value < 1 || value > 100
    ? "Enter a percentage from 1 to 100."
    : "";
};

export const policySchema = z
  .custom<PolicyFormValues>()
  .superRefine((values, context) => {
    const errors = {
      deposit: getDepositError(values),
      late: getFeeError(values.mode, values.late),
      noShow: getFeeError(values.mode, values.noShow),
    };

    Object.entries(errors).forEach(([path, message]) => {
      if (message) context.addIssue({ code: "custom", path: [path], message });
    });
  });

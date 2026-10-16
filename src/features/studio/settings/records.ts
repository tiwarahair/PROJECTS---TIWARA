// Settings pages ⇄ database rows: working hours and the payment policy.
import type { PolicyValue } from "../../../components/payment-policy/payment-policy-logic";
import type { TaxDetails } from "../../../components/tax-details-form/tax-details-logic";
import type { StylistStudio } from "../../../lib/studio-api";
import type { Json, TablesInsert } from "../../../types/database";
import type { StudioState } from "../core/types";

const POLICY_MODES = ["none", "deposit", "full", "card"] as const;

export const toPolicyMode = (value: string) =>
  POLICY_MODES.find((mode) => mode === value) ?? "none";

export const toFeeKind = (value: string) => (value === "pct" ? "pct" : "keep");

export const toExtras = (value: Json): PolicyValue["extras"] =>
  Array.isArray(value)
    ? value.flatMap((item) =>
        item && typeof item === "object" && !Array.isArray(item)
          ? [
              {
                type: item.type === "custom" ? "custom" : "prep",
                text: String(item.text ?? ""),
              },
            ]
          : [],
      )
    : [];

export const fromHours = (hours: StudioState["hours"], stylistId: string) =>
  hours.map(({ on, start, end }, weekday) => ({
    stylist_id: stylistId,
    weekday,
    is_open: on,
    start_time: start,
    end_time: end,
  }));

export const fromPolicy = (
  policy: PolicyValue,
  stylistId: string,
): TablesInsert<"payment_policies"> => ({
  stylist_id: stylistId,
  mode: policy.mode,
  deposit_percent: policy.mode === "deposit" ? policy.deposit : 0,
  refundable: policy.refundable,
  free_window_hours: policy.window,
  grace_minutes: policy.grace,
  late_on: policy.late.on,
  late_kind: policy.late.kind,
  late_percent: policy.late.percent,
  no_show_on: policy.noShow.on,
  no_show_kind: policy.noShow.kind,
  no_show_percent: policy.noShow.percent,
  extras: policy.extras,
});

/** Saved tax details back into the form's shape; the NI number itself never leaves the server. */
export const toTaxDetails = (
  row: NonNullable<StylistStudio["stylist_tax_details"]>,
): TaxDetails => {
  const [year = "", month = "", day = ""] = (row.date_of_birth ?? "").split(
    "-",
  );

  return {
    kind: row.kind === "ltd" ? "ltd" : "sole",
    nameYes: !row.first_name,
    first: row.first_name ?? "",
    middle: row.middle_name ?? "",
    last: row.last_name ?? "",
    legalName: row.legal_name ?? "",
    day,
    month,
    year,
    nationalInsuranceNumber: "",
    nationalInsuranceHint: row.ni_hint ?? "",
    companyName: row.company_name ?? "",
    companyNumber: row.company_number ?? "",
    isAddressSame: row.is_address_same,
    address: {
      line1: row.line1 ?? "",
      line2: row.line2 ?? "",
      city: row.city ?? "",
      postcode: row.postcode ?? "",
    },
  };
};

// PaymentPolicy state, validation and save-bar summary.
import type { PolicyMode } from "../../types/policy";

export type ExtraType = "prep" | "custom";
export type FeeName = "late" | "noShow";

export interface FeeValues {
  on: boolean;
  kind: "keep" | "pct";
  percent: string;
}

export interface PolicyExtra {
  type: ExtraType;
  text: string;
}

export interface PolicyFormValues {
  mode: PolicyMode;
  deposit: string;
  refundable: boolean;
  freeWindowHours: number;
  late: FeeValues;
  noShow: FeeValues;
  grace: number;
  extras: PolicyExtra[];
}

/** What onSave receives; also accepted back as `value` to seed the form. */
export interface PolicyValue {
  mode: PolicyMode;
  deposit: number;
  refundable: boolean;
  window: number;
  grace: number;
  late: { on: boolean; kind: "keep" | "pct"; percent: number };
  noShow: { on: boolean; kind: "keep" | "pct"; percent: number };
  extras: { type: ExtraType; text: string }[];
}

/** What the host (Studio) gets after every render to drive its own save button. */
export interface PaymentPolicyApi {
  canSave: boolean;
  isDirty: boolean;
  save: () => void;
}

export interface PaymentPolicyProps {
  embedded?: boolean;
  hideSave?: boolean;
  value: PolicyValue;
  bookingsCount?: number;
  stylistName: string;
  onSave?: (value: PolicyValue) => void | Promise<boolean>;
  onState?: (api: PaymentPolicyApi) => void;
}

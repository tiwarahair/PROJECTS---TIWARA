// PaymentPolicy state, validation and save-bar summary.
import type { FeeKind, PolicyFee, PolicyMode } from "../../types/policy";

export type ExtraType = "prep" | "custom";
export type FeeName = "late" | "noShow";

export interface FeeValues {
  on: boolean;
  kind: FeeKind;
  percent: string;
}

export interface PolicyExtra {
  type: ExtraType;
  text: string;
}

export interface PolicyFormExtra extends PolicyExtra {
  key: string;
}

export interface PolicyFormValues {
  mode: PolicyMode;
  deposit: string;
  refundable: boolean;
  freeWindowHours: number;
  late: FeeValues;
  noShow: FeeValues;
  grace: number;
  extras: PolicyFormExtra[];
}

/** What onSave receives; also accepted back as `value` to seed the form. */
export interface PolicyValue {
  mode: PolicyMode;
  deposit: number;
  refundable: boolean;
  window: number;
  grace: number;
  late: PolicyFee;
  noShow: PolicyFee;
  extras: PolicyExtra[];
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
  /** A promise resolves false when nothing was saved yet, and rejects when the save failed. */
  onSave?: (value: PolicyValue) => void | Promise<boolean>;
  onState?: (api: PaymentPolicyApi) => void;
}

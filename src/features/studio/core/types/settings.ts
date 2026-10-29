import type { PolicyValue } from "../../../../components/payment-policy/types";
import type { TwoFactorEnrolment } from "../../../../lib/two-factor";

export interface StudioProfile {
  salon: string;
  about: string;
  address: string;
  mobile: boolean;
  site: string;
  instagram: string;
  tiktok: string;
  email: string;
  youtube?: string;
}

export interface StudioRules {
  maxNotice: number;
  minNoticeMinutes: number;
  extra: number;
  travel: number;
}

export type StudioPolicy = Omit<PolicyValue, "extras"> & {
  extras: PolicyValue["extras"];
};

export interface TwoFactorDevice {
  /** The Supabase factor. */
  id?: string;
  name: string;
  backup: boolean;
}

export interface TwoFactorFlow {
  step: string;
  kind: string;
  name: string;
  code: string;
  error: string;
  errorMessage: string;
  keyShown: boolean;
  option: string;
  skipWarn: boolean;
  flow: string;
  from?: string;
  /** A real account's app being added: its QR code and key. */
  enrolment?: TwoFactorEnrolment | null;
  isEnrolmentFailed?: boolean;
  isVerified?: boolean;
  isJustVerified?: boolean;
  isBusy?: boolean;
  keyCopied?: boolean;
  /** The screens before this one, newest last; Back restores the last. */
  history?: TwoFactorFlow[];
}

export interface StudioCheck {
  availability: boolean;
  profile: boolean;
  stripe: boolean;
}

export type PolicyMode = "none" | "deposit" | "full" | "card";

export interface PolicyFee {
  on: boolean;
  kind: "pct" | "keep";
  percent: number;
}

interface PolicyExtra {
  text: string;
}

/** Booking protection shared by Payment policy, Booking, Profile and Search. */
export interface Policy {
  mode: PolicyMode;
  depositPercent: number;
  refundable: boolean;
  freeWindowHours: number;
  late: PolicyFee;
  noShow: PolicyFee;
  graceMinutes: number;
  extras: PolicyExtra[];
}

export interface PolicyIcons {
  payment: string;
  calendar: string;
  late: string;
  noShow: string;
}

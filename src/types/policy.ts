export type PolicyMode = "none" | "deposit" | "full" | "card";

export interface PolicyFee {
  on: boolean;
  kind: "pct" | "keep";
  pct: number;
}

export interface PolicyExtra {
  text: string;
}

/** Booking protection shared by Payment policy, Booking, Profile and Search (data.js POL()). */
export interface Policy {
  mode: PolicyMode;
  depositPct: number;
  refundable: boolean;
  freeWindowHrs: number;
  late: PolicyFee;
  noShow: PolicyFee;
  graceMins: number;
  extras: PolicyExtra[];
}

export interface PolicyIcons {
  pay: string;
  cal: string;
  late: string;
  ns: string;
}

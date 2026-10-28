import type { FeeKind } from "../types/policy";

export const toFeeKind = (value: string): FeeKind =>
  value === "pct" ? "percent" : "keep";

export const fromFeeKind = (kind: FeeKind) =>
  kind === "percent" ? "pct" : "keep";

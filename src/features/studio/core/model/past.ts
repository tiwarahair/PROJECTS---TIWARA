import type { PastRecord, StudioState } from "../types";

export const getPastRows = (
  state: StudioState,
  isNew: boolean,
  seed: PastRecord[],
): PastRecord[] => {
  if (isNew) return [];

  const overrides = state.pastOverrides ?? {};

  return state.pastNew.concat(
    seed.map((original, index) => {
      const row = original.pastId
        ? original
        : { pastId: `seed-${index}`, ...original };

      const override = overrides[String(row.pastId)];

      return override ? { ...row, ...override } : row;
    }),
  );
};

export const isPastIn = (row: PastRecord, filter: string): boolean => {
  if (filter === "completed") return row.status === "Completed";

  if (filter === "off") return row.status !== "Completed";

  if (filter === "cancelled") return row.status === "Cancelled";

  if (filter === "noshow") return row.status === "No show";

  if (filter === "failed") return row.status === "Payment failed";

  return true;
};

export const getPastKey = (row: PastRecord): string | number =>
  row.pastId || `${row.client}|${row.when}|${row.time}`;

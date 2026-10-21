import type { PastRecord } from "../types";

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

import { describe, expect, it } from "vitest";
import type { Transaction } from "../data";
import { getBuckets } from "../dates";
import { getClient, getStats, getTotals } from "../logic";

const transaction = (amount: number, fee: number | null): Transaction => ({
  id: "TX-1",
  client: "nia",
  service: "Silk press",
  bookingRef: "BK-1",
  appointment: new Date(2026, 9, 1),
  description: "Balance",
  method: "Saved card",
  at: new Date(2026, 9, 1),
  amount,
  fee,
  net: amount - (fee ?? 0),
  status: "Available",
});

describe("earnings logic", () => {
  it("totals gross, fees and refunds to the penny", () => {
    const items = [
      transaction(65, 1.18),
      transaction(10.1, 0.35),
      transaction(-20, null),
    ];

    expect(getTotals(items)).toEqual({
      gross: 75.1,
      fees: 1.53,
      refunds: -20,
      net: 53.57,
    });

    expect(getStats(items)).toEqual({
      takings: 75.1,
      fees: 1.53,
      refunds: -20,
      net: 53.57,
    });
  });

  it("unknown clients are walk-ins", () => {
    expect(getClient("nobody")).toEqual({ name: "Walk-in" });
    expect(getClient("nia", []).name).toBe("Walk-in");
  });

  it("chart buckets are days, weeks or months by the range's length", () => {
    const range = (days: number) => ({
      start: new Date(2026, 0, 1),
      end: new Date(2026, 0, 1 + days),
    });

    expect(getBuckets(range(7)).title).toBe("Takings by day");
    expect(getBuckets(range(7)).buckets).toHaveLength(7);
    expect(getBuckets(range(60)).title).toBe("Weekly takings");
    expect(getBuckets(range(200)).title).toBe("Monthly takings");
  });
});

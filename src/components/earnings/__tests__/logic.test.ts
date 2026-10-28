import { describe, expect, it } from "vitest";
import type { Transaction } from "../data";
import { getBuckets } from "../dates";
import { getClient, getPausedCauses, getStats, getTotals } from "../logic";

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

  it("a paused balance comes from refunds and recoveries since the last payout", () => {
    const at = (day: number) => ({ at: new Date(2026, 9, day) });
    const refund = { ...transaction(-20, 0), id: "refund", ...at(5) };

    const recovery = {
      ...transaction(-15, 0),
      id: "recovery",
      status: "Pending" as const,
      ...at(6),
    };

    const older = { ...transaction(-30, 0), id: "older", ...at(1) };
    const recorded = { ...refund, id: "recorded", isRecorded: true };
    const paidOut = { ...refund, id: "paid", status: "Paid out" as const };
    const payment = { ...transaction(40, 1), ...at(5) };

    const payout = {
      id: "PO-1",
      amount: 40,
      gross: 40,
      fees: 0,
      refunds: 0,
      sent: new Date(2026, 9, 3),
      arrive: new Date(2026, 9, 4),
      status: "Paid" as const,
      items: [],
      from: new Date(2026, 9, 1),
    };

    const causes = getPausedCauses({
      transactions: [recovery, refund, payment, recorded, paidOut, older],
      payouts: [payout],
      available: 0,
      pending: 0,
      onHold: 0,
      pausedAmount: 35,
      nextDate: null,
      today: new Date(2026, 9, 7),
      scenario: "paused",
    });

    expect(causes.map(({ id }) => id)).toEqual(["recovery", "refund"]);
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

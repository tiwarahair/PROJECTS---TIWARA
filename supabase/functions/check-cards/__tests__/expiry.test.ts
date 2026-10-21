import { describe, expect, it } from "vitest";
import { expiresBefore } from "../expiry.ts";

describe("a card expiring before the appointment", () => {
  it("works through the last day of its expiry month", () => {
    expect(expiresBefore(10, 2026, "2026-10-31T18:00:00Z")).toBe(false);
  });

  it("fails an appointment in the month after", () => {
    expect(expiresBefore(10, 2026, "2026-11-01T09:00:00Z")).toBe(true);
  });
});

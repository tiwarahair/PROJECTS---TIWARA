import { Calendar, Clock, CreditCard, UserX } from "lucide-react";
import { describe, expect, it } from "vitest";
import { DEMO_STYLISTS } from "../../test/fixtures/demo-stylists";
import { bookingFee, getCancellationLabel, policyLines } from "../pricing";

describe("bookingFee", () => {
  it("matches booking_fee_pence in the database (supabase/tests/public-profiles.test.sql)", () => {
    expect(bookingFee(50)).toBe(1.25);
    expect(bookingFee(80.33)).toBe(1.7);
  });
});

describe("getCancellationLabel", () => {
  const window = { refundable: true, freeWindowHours: 48 };

  it("says the same thing on the profile and at Review for each policy", () => {
    expect(getCancellationLabel({ ...window, mode: "deposit" })).toBe(
      "Free cancellation up to 48h",
    );

    expect(getCancellationLabel({ ...window, mode: "full" })).toBe(
      "Free cancellation up to 48h",
    );

    expect(getCancellationLabel({ ...window, mode: "card" })).toBe(
      "Free cancellation up to 48h",
    );

    expect(
      getCancellationLabel({ ...window, mode: "deposit", refundable: false }),
    ).toBe("Deposit non-refundable");

    expect(getCancellationLabel({ ...window, mode: "none" })).toBe("");
  });

  it("a half-hour window reads as minutes", () => {
    expect(
      getCancellationLabel({ ...window, mode: "card", freeWindowHours: 0.5 }),
    ).toBe("Free cancellation up to 30 min");
  });
});

describe("policyLines", () => {
  it("marks each line with its lucide icon", () => {
    const policy = {
      ...DEMO_STYLISTS[0]!.policies,
      late: { on: true, kind: "percent" as const, percent: 25 },
      noShow: { on: true, kind: "percent" as const, percent: 50 },
    };

    const icons = policyLines(policy, 80, "Amara").lines.map(
      ({ icon }) => icon,
    );

    expect(icons).toEqual(
      expect.arrayContaining([CreditCard, Calendar, Clock, UserX]),
    );
  });

  it("Review's cancellation line starts with the profile's chip", () => {
    const policy = {
      ...DEMO_STYLISTS[0]!.policies,
      mode: "deposit" as const,
      depositPercent: 20,
      refundable: false,
    };

    const cancellation = policyLines(policy, 80, "Amara").lines.find(
      ({ icon }) => icon === Calendar,
    );

    expect(cancellation?.text).toMatch(/^Deposit non-refundable: your £16/);
  });
});

import { Calendar, Clock, CreditCard, UserX } from "lucide-react";
import { describe, expect, it } from "vitest";
import { DEMO_STYLISTS } from "../../test/fixtures/demo-stylists";
import { bookingFee, policyLines } from "../pricing";

describe("bookingFee", () => {
  it("matches booking_fee_pence in the database (supabase/tests/public-profiles.test.sql)", () => {
    expect(bookingFee(50)).toBe(1.25);
    expect(bookingFee(80.33)).toBe(1.7);
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
});

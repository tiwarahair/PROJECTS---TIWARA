import { describe, expect, it } from "vitest";
import { bookingFee } from "../pricing";

describe("bookingFee", () => {
  it("matches booking_fee_pence in the database (supabase/tests/public-profiles.test.sql)", () => {
    expect(bookingFee(50)).toBe(1.25);
    expect(bookingFee(80.33)).toBe(1.7);
  });
});

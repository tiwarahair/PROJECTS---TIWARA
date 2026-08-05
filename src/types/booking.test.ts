import { describe, expect, it } from "vitest";
import {
  BOOKING_STEP,
  FULL_SEQUENCE,
  STYLIST_KNOWN_SEQUENCE,
  nextStep,
  prevStep,
} from "./booking";

describe("nextStep", () => {
  it("walks the full sequence in order", () => {
    expect(nextStep(FULL_SEQUENCE, BOOKING_STEP.style)).toBe(
      BOOKING_STEP.whenWhere,
    );
    expect(nextStep(FULL_SEQUENCE, BOOKING_STEP.whenWhere)).toBe(
      BOOKING_STEP.stylist,
    );
  });

  it("skips when&where and the stylist picker in the shortened sequence", () => {
    expect(nextStep(STYLIST_KNOWN_SEQUENCE, BOOKING_STEP.style)).toBe(
      BOOKING_STEP.customise,
    );
  });

  it("stops at the confirmation step", () => {
    expect(nextStep(FULL_SEQUENCE, BOOKING_STEP.confirm)).toBe(
      BOOKING_STEP.confirm,
    );
  });

  // A stale URL such as /book/stylist on a stylist-known booking.
  it("falls back to the first step when given one this sequence skips", () => {
    expect(nextStep(STYLIST_KNOWN_SEQUENCE, BOOKING_STEP.stylist)).toBe(
      BOOKING_STEP.style,
    );
  });
});

describe("prevStep", () => {
  it("walks backwards through the full sequence", () => {
    expect(prevStep(FULL_SEQUENCE, BOOKING_STEP.stylist)).toBe(
      BOOKING_STEP.whenWhere,
    );
  });

  it("steps back over the skipped steps in the shortened sequence", () => {
    expect(prevStep(STYLIST_KNOWN_SEQUENCE, BOOKING_STEP.customise)).toBe(
      BOOKING_STEP.style,
    );
  });

  it("stops at the style step", () => {
    expect(prevStep(FULL_SEQUENCE, BOOKING_STEP.style)).toBe(
      BOOKING_STEP.style,
    );
  });
});

import { describe, expect, it } from "vitest";
import {
  BOOKING_STEP,
  buildSequence,
  firstUnansweredStep,
  nextStep,
  prevStep,
} from "./booking";
import type { BookingContext } from "./booking";

function context(overrides: Partial<BookingContext> = {}): BookingContext {
  return {
    serviceId: null,
    styleId: null,
    stylistId: null,
    customisable: true,
    ...overrides,
  };
}

const FULL = buildSequence(context());
const STYLIST_KNOWN = buildSequence(context({ stylistId: "tiwara" }));

describe("buildSequence", () => {
  it("visits every step when nothing is settled", () => {
    expect(FULL).toEqual([
      BOOKING_STEP.service,
      BOOKING_STEP.style,
      BOOKING_STEP.whenWhere,
      BOOKING_STEP.stylist,
      BOOKING_STEP.customise,
      BOOKING_STEP.schedule,
      BOOKING_STEP.details,
      BOOKING_STEP.review,
      BOOKING_STEP.confirm,
    ]);
  });

  it("drops when&where and the stylist picker once the stylist is settled", () => {
    expect(STYLIST_KNOWN).not.toContain(BOOKING_STEP.whenWhere);
    expect(STYLIST_KNOWN).not.toContain(BOOKING_STEP.stylist);
    expect(STYLIST_KNOWN).toHaveLength(7);
  });

  it("drops customise for a service with nothing to customise", () => {
    const sequence = buildSequence(context({ customisable: false }));

    expect(sequence).not.toContain(BOOKING_STEP.customise);
    expect(sequence).toHaveLength(8);
  });

  // Pre-answering is not the same as being unable to answer: the client must
  // still be able to step back and change their mind.
  it("keeps the service and style steps even when both are pre-answered", () => {
    const sequence = buildSequence(
      context({ serviceId: "braids", styleId: "knotless" }),
    );

    expect(sequence).toContain(BOOKING_STEP.service);
    expect(sequence).toContain(BOOKING_STEP.style);
  });
});

describe("firstUnansweredStep", () => {
  it("opens on the service step when the URL settles nothing", () => {
    expect(firstUnansweredStep(context())).toBe(BOOKING_STEP.service);
  });

  it("opens on the style step when only the service is settled", () => {
    expect(firstUnansweredStep(context({ serviceId: "braids" }))).toBe(
      BOOKING_STEP.style,
    );
  });

  // An AI discovery match: service and style known, but nobody to do it yet.
  it("opens on when&where when the style is settled but the stylist is not", () => {
    expect(
      firstUnansweredStep(
        context({ serviceId: "braids", styleId: "knotless" }),
      ),
    ).toBe(BOOKING_STEP.whenWhere);
  });

  // A stylist's profile service row settles all three.
  it("opens on customise when the service, style and stylist are all settled", () => {
    expect(
      firstUnansweredStep(
        context({
          serviceId: "braids",
          styleId: "knotless",
          stylistId: "tiwara",
        }),
      ),
    ).toBe(BOOKING_STEP.customise);
  });

  it("opens on the schedule when there is nothing left to customise either", () => {
    expect(
      firstUnansweredStep(
        context({
          serviceId: "treatments",
          styleId: "deepcond",
          stylistId: "tiwara",
          customisable: false,
        }),
      ),
    ).toBe(BOOKING_STEP.schedule);
  });
});

describe("nextStep", () => {
  it("walks the full sequence in order", () => {
    expect(nextStep(FULL, BOOKING_STEP.service)).toBe(BOOKING_STEP.style);
    expect(nextStep(FULL, BOOKING_STEP.style)).toBe(BOOKING_STEP.whenWhere);
    expect(nextStep(FULL, BOOKING_STEP.whenWhere)).toBe(BOOKING_STEP.stylist);
  });

  it("skips when&where and the stylist picker in the shortened sequence", () => {
    expect(nextStep(STYLIST_KNOWN, BOOKING_STEP.style)).toBe(
      BOOKING_STEP.customise,
    );
  });

  it("stops at the confirmation step", () => {
    expect(nextStep(FULL, BOOKING_STEP.confirm)).toBe(BOOKING_STEP.confirm);
  });

  // A stale URL such as /book/stylist on a stylist-known booking.
  it("falls back to the first step when given one this sequence skips", () => {
    expect(nextStep(STYLIST_KNOWN, BOOKING_STEP.stylist)).toBe(
      BOOKING_STEP.service,
    );
  });
});

describe("prevStep", () => {
  it("walks backwards through the full sequence", () => {
    expect(prevStep(FULL, BOOKING_STEP.stylist)).toBe(BOOKING_STEP.whenWhere);
    expect(prevStep(FULL, BOOKING_STEP.style)).toBe(BOOKING_STEP.service);
  });

  it("steps back over the skipped steps in the shortened sequence", () => {
    expect(prevStep(STYLIST_KNOWN, BOOKING_STEP.customise)).toBe(
      BOOKING_STEP.style,
    );
  });

  it("stops at the service step", () => {
    expect(prevStep(FULL, BOOKING_STEP.service)).toBe(BOOKING_STEP.service);
  });
});

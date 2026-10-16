import { describe, expect, it } from "vitest";
import { getTimeHints } from "../time-hints";

const open = { day: "Mon", on: true, start: "09:00", end: "18:00" };
const closed = { ...open, on: false };

describe("bookings → time hints", () => {
  it("names the working hours for a custom time inside them", () => {
    expect(getTimeHints(open, true, "10:00")).toEqual({
      noSlotsText:
        "No free 30-minute starts left this day. Use a custom time if you want to squeeze it in.",
      customHint: "Any time between 09:00 and 18:00",
      isCustomWarn: false,
    });
  });

  it("warns about a custom time outside the hours", () => {
    expect(getTimeHints(open, true, "18:00")).toMatchObject({
      customHint: "Outside your hours (09:00–18:00). You can still book it.",
      isCustomWarn: true,
    });
  });

  it("warns on a closed day", () => {
    expect(getTimeHints(closed, false, "")).toEqual({
      noSlotsText:
        "You’re closed this day. Use a custom time to book it anyway.",
      customHint: "You’re closed this day. You can still book it.",
      isCustomWarn: true,
    });
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { getSheetDefaults } from "../sheets";

describe("getSheetDefaults", () => {
  afterEach(() => vi.useRealTimers());

  it("clears the client a booking or past sheet came from", () => {
    expect(getSheetDefaults("booking", {})).toEqual({ fromClientId: null });
    expect(getSheetDefaults("past", {})).toEqual({ fromClientId: null });
  });

  it("starts a new booking at step one with fresh lists", () => {
    const first = getSheetDefaults("add", {});
    const second = getSheetDefaults("add", {});

    expect(first).toMatchObject({ addStep: 1, addAddons: [], addNote: "" });
    expect(first.addAddons).not.toBe(second.addAddons);
  });

  it("opens the block calendar on the draft's month", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 8, 7));

    const blockDraft = { day: 30, start: "09:00", end: "10:00", reason: "" };

    expect(getSheetDefaults("block", { blockDraft })).toEqual({
      blockCalendarMonth: 9,
      blockCalendarYear: 2026,
    });
  });

  it("adds nothing for other sheets", () => {
    expect(getSheetDefaults("block", {})).toEqual({});
    expect(getSheetDefaults("notif", {})).toEqual({});
  });
});

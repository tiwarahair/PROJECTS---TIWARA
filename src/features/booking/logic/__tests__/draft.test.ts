import { describe, expect, it } from "vitest";
import { EMPTY_ADDRESS, EMPTY_DETAILS } from "../constants";
import { getDraftPatch } from "../draft";
import { getMonthRange } from "../slots";
import type { BookingDraft, BookingState } from "../types";

const HOUR_MS = 36e5;
const tomorrow = new Date(Date.now() + 24 * HOUR_MS);
const yesterday = new Date(Date.now() - 24 * HOUR_MS);

const state = {
  details: EMPTY_DETAILS,
  appointmentAddress: EMPTY_ADDRESS,
} as BookingState;

const makeDraft = (
  day: Date,
  holdUntil: number | null,
  step = 5,
): BookingDraft => ({
  at: Date.now(),
  step,
  serviceId: "knotless",
  selection: { size: null, length: null, colour: "", own: {}, addons: [] },
  calendarMonth: day.getMonth(),
  calendarYear: day.getFullYear(),
  date: day.getDate(),
  time: "10:30",
  details: { ...EMPTY_DETAILS, first: "Nia" },
  appointmentAddress: EMPTY_ADDRESS,
  holdUntil,
  holdId: "hold-1",
  holdSecret: "secret",
});

describe("getDraftPatch", () => {
  it("keeps the time and hold while the hold lasts", () => {
    const until = Date.now() + HOUR_MS;
    const patch = getDraftPatch(makeDraft(tomorrow, until), state);

    expect(patch).toMatchObject({
      step: 5,
      date: tomorrow.getDate(),
      time: "10:30",
      hold: { id: "hold-1", secret: "secret", until },
      repickNote: false,
      guest: true,
    });
  });

  it("sends a released time back to Time, keeping the date", () => {
    const patch = getDraftPatch(makeDraft(tomorrow, null), state);

    expect(patch).toMatchObject({
      step: 3,
      date: tomorrow.getDate(),
      time: null,
      hold: null,
      repickNote: true,
    });
  });

  it("drops a past date and keeps an earlier step", () => {
    const patch = getDraftPatch(makeDraft(yesterday, null, 2), state);

    expect(patch).toMatchObject({
      step: 2,
      date: null,
      time: null,
      repickNote: false,
    });
  });
});

describe("getMonthRange", () => {
  it("spans the month's first and last days", () => {
    expect(getMonthRange(2028, 1)).toEqual({
      from: "2028-02-01",
      to: "2028-02-29",
    });
  });
});

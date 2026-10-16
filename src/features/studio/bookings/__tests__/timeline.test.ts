import { describe, expect, it } from "vitest";
import {
  getHourLabel,
  getTappedMinutes,
  getTimeToPixels,
  isOutsideHours,
  toPixels,
} from "../timeline";

const hours = { day: "Mon", on: true, start: "09:00", end: "18:00" };

describe("bookings → timeline helpers", () => {
  it("places minutes on the timeline in whole pixels", () => {
    expect(toPixels(getTimeToPixels(128)(90))).toBe("192px");
  });

  it("labels each hour, leaving midnight at the end blank", () => {
    expect(getHourLabel(7)).toBe("07:00");
    expect(getHourLabel(13)).toBe("13:00");
    expect(getHourLabel(24)).toBe("");
  });

  it("knows when a time is outside the working hours", () => {
    expect(isOutsideHours(hours, 9 * 60)).toBe(false);
    expect(isOutsideHours(hours, 18 * 60)).toBe(true);
    expect(isOutsideHours({ ...hours, on: false }, 12 * 60)).toBe(true);
  });

  it("snaps a tapped quarter to a start time within the day", () => {
    expect(getTappedMinutes(5)).toBe(75);
    expect(getTappedMinutes(-2)).toBe(0);
    expect(getTappedMinutes(200)).toBe(23 * 60 + 45);
  });
});

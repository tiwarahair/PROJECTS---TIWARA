import { describe, expect, it } from "vitest";
import {
  LONG_MONTHS,
  LONG_WEEKDAYS,
  MONDAY_FIRST_WEEKDAYS,
  SHORT_MONTHS,
  SHORT_MONTHS_SEPT,
  SHORT_WEEKDAYS,
  formatClockTime,
  getMinutesOfDay,
  formatDuration,
  formatWeekdayDate,
  toIsoDate,
} from "../dates";

describe("date names", () => {
  it("lists weekdays Sunday first, with a Monday-first view", () => {
    expect(LONG_WEEKDAYS[0]).toBe("Sunday");

    expect(SHORT_WEEKDAYS).toEqual([
      "Sun",
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
    ]);

    expect(MONDAY_FIRST_WEEKDAYS).toEqual([
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
      "Sun",
    ]);
  });

  it("lists months, with and without Sept", () => {
    expect(LONG_MONTHS).toHaveLength(12);
    expect(LONG_MONTHS[8]).toBe("September");
    expect(SHORT_MONTHS[8]).toBe("Sep");
    expect(SHORT_MONTHS_SEPT[8]).toBe("Sept");
    expect(SHORT_MONTHS_SEPT[9]).toBe("Oct");
  });
});

describe("date formatters", () => {
  const date = new Date(2026, 9, 14, 9, 5);

  it("formats a local ISO date", () => {
    expect(toIsoDate(date)).toBe("2026-10-14");
    expect(toIsoDate(new Date(2026, 0, 3))).toBe("2026-01-03");
  });

  it("formats a clock time", () => {
    expect(formatClockTime(date)).toBe("09:05");
  });

  it("formats a short weekday date", () => {
    expect(formatWeekdayDate(date)).toBe("Wed 14 Oct");
  });
});

describe("formatDuration", () => {
  it("reads hours and minutes", () => {
    expect(formatDuration(0)).toBe("0m");
    expect(formatDuration(45)).toBe("45m");
    expect(formatDuration(60)).toBe("1h");
    expect(formatDuration(240)).toBe("4h");
    expect(formatDuration(270)).toBe("4h 30m");
    expect(formatDuration(61)).toBe("1h 1m");
  });

  it("rounds to whole minutes", () => {
    expect(formatDuration(44.6)).toBe("45m");
  });
});

describe("getMinutesOfDay", () => {
  it("counts minutes since midnight", () => {
    expect(getMinutesOfDay(new Date(2026, 8, 7, 9, 45))).toBe(585);
  });
});

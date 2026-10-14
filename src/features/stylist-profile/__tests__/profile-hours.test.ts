import { describe, expect, it } from "vitest";
import { toPublicStylist } from "../../../lib/public-stylist";
import { PUBLIC_PROFILE } from "../../../test/public-profile";
import { getHoursRows, getOpenStatus } from "../profile-hours";

const { hours } = toPublicStylist(PUBLIC_PROFILE);

// 2026-10-05 is a Monday (open 10:00–20:00); 2026-10-04 is a Sunday (closed)
const at = (date: string, time: string) => new Date(`${date}T${time}`);

describe("getOpenStatus", () => {
  it("open now: until closing, with the next opening from the server", () => {
    const nextStart = at("2026-10-06", "10:30");

    expect(getOpenStatus(hours, nextStart, at("2026-10-05", "14:20"))).toEqual({
      isOpen: true,
      nextAvailable: "tomorrow 10:30",
      openLabel: "Open now",
      openHours: "until 20:00",
    });
  });

  it("before opening it shows today's opening time", () => {
    expect(getOpenStatus(hours, null, at("2026-10-05", "08:00"))).toEqual({
      isOpen: false,
      nextAvailable: "by request",
      openLabel: "Closed",
      openHours: "opens 10:00",
    });
  });

  it("after closing, and on Sunday, it points at the next open day", () => {
    expect(
      getOpenStatus(hours, null, at("2026-10-05", "21:00")).openHours,
    ).toBe("opens Tuesday 10:00");

    expect(
      getOpenStatus(hours, null, at("2026-10-04", "12:00")).openHours,
    ).toBe("opens Monday 10:00");
  });
});

describe("getHoursRows", () => {
  it("groups days with the same hours", () => {
    expect(getHoursRows(hours)).toEqual([
      { day: "Mon – Fri", time: "10:00 – 20:00", shut: false },
      { day: "Saturday", time: "9:00 – 18:00", shut: false },
      { day: "Sunday", time: "Closed", shut: true },
    ]);
  });
});

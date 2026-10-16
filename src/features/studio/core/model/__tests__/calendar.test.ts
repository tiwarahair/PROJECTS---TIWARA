import { afterEach, describe, expect, it, vi } from "vitest";
import { getBlockTitle, getNowMinutes } from "../calendar";

const block = {
  id: "b1",
  day: "Mon",
  dayIndex: 0,
  span: "All day",
  reason: "Lunch · Repeats weekly until 1 Dec",
};

describe("getBlockTitle", () => {
  it("drops the repeat label", () => {
    expect(getBlockTitle(block)).toBe("Lunch");
  });

  it("falls back when there's no reason", () => {
    expect(getBlockTitle({ ...block, reason: "" })).toBe("Blocked time");
    expect(getBlockTitle(undefined)).toBe("Blocked time");
  });
});

describe("getNowMinutes", () => {
  afterEach(() => vi.useRealTimers());

  it("counts minutes since midnight", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 8, 7, 9, 45));
    expect(getNowMinutes()).toBe(585);
  });
});

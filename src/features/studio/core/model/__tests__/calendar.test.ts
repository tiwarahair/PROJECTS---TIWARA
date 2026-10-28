import { describe, expect, it } from "vitest";
import { getBlockTitle } from "../calendar";

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

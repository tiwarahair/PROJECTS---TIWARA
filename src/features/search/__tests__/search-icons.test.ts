import { describe, expect, it } from "vitest";
import { getRowStrokeWidth, SEARCH_ICONS } from "../search-icons";

describe("getRowStrokeWidth", () => {
  it("draws location pins a little bolder than the other row icons", () => {
    expect(getRowStrokeWidth(SEARCH_ICONS.pin)).toBe(1.8);
    expect(getRowStrokeWidth(SEARCH_ICONS.search)).toBe(1.7);
    expect(getRowStrokeWidth(SEARCH_ICONS.calendar)).toBe(1.7);
  });
});

import { describe, expect, it, vi } from "vitest";
import { getEmptySuggestions } from "../empty-suggestions";
import type { StyleSelection } from "../logic";
import { getInitialState } from "../state";

const selection = { serviceType: null, group: null } as StyleSelection;

const getLabels = (hasDistance: boolean) =>
  getEmptySuggestions(
    getInitialState("", 1200),
    selection,
    vi.fn(),
    vi.fn(),
    hasDistance,
  ).map(({ label }) => label);

describe("empty search suggestions", () => {
  it("offers a wider radius only when there's a location to measure from", () => {
    expect(getLabels(true)).toContain("Widen to 15 miles");
    expect(getLabels(false)).not.toContain("Widen to 15 miles");
  });
});

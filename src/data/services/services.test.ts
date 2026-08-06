import { describe, expect, it } from "vitest";
import { getCustomisableGroups } from "./services";

describe("getCustomisableGroups", () => {
  it("lists the look groups a service asks about", () => {
    expect(getCustomisableGroups("braids")).toEqual([
      "length",
      "colour",
      "size",
    ]);
    expect(getCustomisableGroups("wigs")).toEqual([
      "length",
      "hairTexture",
      "colour",
    ]);
    expect(getCustomisableGroups("locs")).toEqual(["length", "size"]);
    expect(getCustomisableGroups("natural-hair")).toEqual(["length"]);
  });

  // Add-ons are optional extras, not a decision the look depends on.
  it("never counts add-ons as a group", () => {
    for (const id of ["braids", "natural-hair"] as const) {
      expect(getCustomisableGroups(id)).not.toContain("addOns");
    }
  });

  it("returns nothing for a service with nothing to customise", () => {
    expect(getCustomisableGroups("treatments")).toEqual([]);
  });

  it("returns nothing before a service is chosen", () => {
    expect(getCustomisableGroups(null)).toEqual([]);
  });

  // The preview's bar sits alongside the customise column, so the segments
  // have to run in the same order the client scrolls through.
  it("orders groups the way the customise step renders them", () => {
    expect(getCustomisableGroups("wigs")).toEqual([
      "length",
      "hairTexture",
      "colour",
    ]);
  });
});

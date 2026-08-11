import { describe, expect, it } from "vitest";
import { colourSolid, colourStrand, findColourById } from "./colours";

/** Relative luminance, enough to compare two shades for legibility. */
const brightness = (hex: string) => {
  const [red, green, blue] = [1, 3, 5].map((at) =>
    parseInt(hex.slice(at, at + 2), 16),
  );
  return (red! * 299 + green! * 587 + blue! * 114) / 1000;
};

describe("colourSolid", () => {
  it("returns the swatch's own hex", () => {
    expect(colourSolid("613")).toBe("#D4C050");
    expect(colourSolid("33")).toBe("#8F1112");
  });

  // "Other" is a multi-tone gradient, which is not a colour anything can paint.
  it("falls back to the default for the gradient swatch", () => {
    expect(colourSolid("other")).toBe(findColourById("30").hex);
  });
});

describe("colourStrand", () => {
  it("returns a plain hex colour", () => {
    for (const id of ["1", "1B", "30", "4", "33", "613", "other"] as const) {
      expect(colourStrand(id)).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  // The panel behind is #060402, so an unlifted Jet Black strand is invisible.
  it("lifts every shade clear of the near-black panel", () => {
    const panel = brightness("#060402");
    for (const id of ["1", "1B", "30", "4", "33", "613", "other"] as const) {
      expect(brightness(colourStrand(id))).toBeGreaterThan(panel + 20);
    }
  });

  it("lifts the darkest shades the most, in absolute terms", () => {
    const jetBlackLift =
      brightness(colourStrand("1")) - brightness(colourSolid("1"));
    const blondeLift =
      brightness(colourStrand("613")) - brightness(colourSolid("613"));

    expect(jetBlackLift).toBeGreaterThan(blondeLift);
  });

  it("keeps each shade distinguishable from the others", () => {
    const strands = (["1B", "30", "4", "33", "613"] as const).map(colourStrand);
    expect(new Set(strands).size).toBe(strands.length);
  });
});

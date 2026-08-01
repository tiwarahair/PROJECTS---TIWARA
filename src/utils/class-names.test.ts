import { describe, expect, it } from "vitest";
import { cx } from "./class-names";

describe("cx", () => {
  it("joins truthy class names", () => {
    expect(cx("bp-swatch", "sel")).toBe("bp-swatch sel");
  });

  it("drops falsy values so conditional classes can be inlined", () => {
    const isSelected = false;
    expect(cx("bp-swatch", isSelected && "sel", null, undefined)).toBe(
      "bp-swatch",
    );
  });
});

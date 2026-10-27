import { describe, expect, it } from "vitest";
import { getSavedMobile } from "../saves";

describe("account saves", () => {
  it("stores a mobile without its leading zero, split after four digits", () => {
    expect(getSavedMobile("07700 900123")).toBe("7700 900123");
  });
});

import { describe, expect, it } from "vitest";
import { cleanVatInput, formatVatNumber, getAreaLabel } from "../display";

describe("business details display helpers", () => {
  it("labels the home area and formats VAT numbers", () => {
    expect(getAreaLabel("M14 5TQ")).toBe("Rusholme, M14");
    expect(getAreaLabel("M1 5QA")).toBe("M1");
    expect(getAreaLabel("M14")).toBe("Add your postcode to see your area");
    // same postcode rules as every other form
    expect(getAreaLabel("m14-5tq")).toBe("Rusholme, M14");
    expect(formatVatNumber("312456789012")).toBe("GB 312 4567 89 012");
    expect(cleanVatInput("gb 312a")).toBe("312");
    expect(cleanVatInput(" 3")).toBe("3");
  });
});

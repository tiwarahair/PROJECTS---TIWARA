import { describe, expect, it } from "vitest";
import { isValidEmail, isValidMobile } from "../validation";

describe("validation", () => {
  it("accepts UK mobiles in every common format", () => {
    for (const mobile of [
      "07700 900123",
      "7700900123",
      "+44 7700 900123",
      "(07700) 900-123",
    ])
      expect(isValidMobile(mobile)).toBe(true);
  });

  it("rejects landlines and short numbers", () => {
    for (const mobile of ["0161 496 0000", "07700 9001", "12"])
      expect(isValidMobile(mobile)).toBe(false);
  });

  it("checks the shape of an email address, ignoring outer spaces", () => {
    expect(isValidEmail(" ada@example.com ")).toBe(true);
    expect(isValidEmail("ada@example")).toBe(false);
    expect(isValidEmail("ada example.com")).toBe(false);
  });

  it("accepts real-world email formats", () => {
    for (const email of [
      "nia@gmail.co.uk",
      "nia+book@gmail.com",
      "o'brien@example.ie",
    ])
      expect(isValidEmail(email)).toBe(true);
  });

  it("rejects emails that can't receive mail", () => {
    for (const email of [
      "nia@gmail..com",
      "nia@-gmail.com",
      "nia,okafor@gmail.com",
      "nia@gmail.c0m",
      "nia@gmail.com.",
      "nia.@gmail.com",
      "nia@gmail_.com",
    ])
      expect(isValidEmail(email)).toBe(false);
  });
});

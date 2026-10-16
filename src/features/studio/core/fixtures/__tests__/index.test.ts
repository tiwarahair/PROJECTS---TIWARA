import { describe, expect, it } from "vitest";
import { getFixtures } from "..";

describe("getFixtures", () => {
  it("has a setup for every review state", () => {
    const fixtures = getFixtures();

    expect(fixtures.size).toBe(64);

    [
      "checklist",
      "wiz-sign-err",
      "tax-err-pc",
      "sec-remove",
      "all-done",
    ].forEach((name) => expect(fixtures.has(name)).toBe(true));
  });

  it("ignores names that aren't fixtures", () => {
    expect(getFixtures().get("constructor")).toBeUndefined();
  });
});

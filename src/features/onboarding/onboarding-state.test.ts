import { describe, expect, it } from "vitest";
import {
  getBackScreen,
  getErrors,
  getFixturePatch,
  INITIAL_STATE,
  isValidMobile,
  isValidPostcode,
} from "./onboarding-state";
import type { OnboardingState } from "./onboarding-state";

const at = (patch: Partial<OnboardingState>): OnboardingState => ({
  ...INITIAL_STATE,
  ...patch,
  f: { ...INITIAL_STATE.f, ...patch.f },
});

describe("onboarding validation", () => {
  it("checks the customer sign-up fields", () => {
    const errors = getErrors(at({ screen: "cust-create" }));
    expect(Object.keys(errors).sort()).toEqual([
      "first",
      "last",
      "mob",
      "pw",
      "terms",
    ]);
  });

  it("asks mobile stylists for a base postcode instead of an address", () => {
    expect(
      getErrors(
        at({
          screen: "w3",
          f: { ...INITIAL_STATE.f, biz: "Crown", type: "mobile", pc: "nope" },
        }),
      ),
    ).toEqual({ pc: "Enter a valid UK postcode, like M14 5TQ" });
    expect(
      getErrors(
        at({
          screen: "w3",
          f: { ...INITIAL_STATE.f, biz: "Crown", type: "shop" },
        }),
      ),
    ).toEqual({ addr: "Enter your address" });
  });

  it("validates UK mobiles and postcodes", () => {
    expect(isValidMobile("7700 900123")).toBe(true);
    expect(isValidMobile("07700 900123")).toBe(true);
    expect(isValidMobile("12")).toBe(false);
    expect(isValidPostcode("m14 5tq")).toBe(true);
  });

  it("Back follows the flow; verify returns to the right form", () => {
    expect(getBackScreen(at({ screen: "w3" }))).toBe("w2");
    expect(getBackScreen(at({ screen: "verify", audience: "customer" }))).toBe(
      "cust-create",
    );
    expect(getBackScreen(at({ screen: "verify", audience: "pro" }))).toBe("w5");
  });

  it("fixtures seed board states", () => {
    expect(getFixturePatch("w2", INITIAL_STATE.f)).toMatchObject({
      screen: "w2",
      f: { cats: ["braids", "natural", "locs"] },
    });
    expect(getFixturePatch("pw-good", INITIAL_STATE.f)).toMatchObject({
      screen: "cust-create",
      f: { pw: "sunflower house" },
      pwShow: true,
    });
  });
});

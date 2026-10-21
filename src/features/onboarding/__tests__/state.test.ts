import { describe, expect, it } from "vitest";
import { isPostcodeValid } from "../../../utils/address";
import { isValidMobile } from "../../../utils/validation";
import { getErrors } from "../screen-schemas";
import { getBackScreen, INITIAL_FORM, INITIAL_STATE } from "../state";
import type { StartState } from "../state";

const buildState = (patch: Partial<StartState>): StartState => ({
  ...INITIAL_STATE,
  flow: null,
  ...patch,
  form: { ...INITIAL_FORM, ...patch.form },
});

describe("onboarding validation", () => {
  it("checks the customer sign-up fields", () => {
    const errors = getErrors(buildState({ screen: "cust-create" }));

    expect(Object.keys(errors).sort()).toEqual([
      "first",
      "last",
      "mobile",
      "password",
      "terms",
    ]);
  });

  it("asks mobile stylists for a base postcode instead of an address", () => {
    expect(
      getErrors(
        buildState({
          screen: "w3",
          form: {
            ...INITIAL_FORM,
            businessName: "Crown",
            type: "mobile",
            postcode: "nope",
          },
        }),
      ),
    ).toEqual({ postcode: "Enter a valid UK postcode, like M14 5TQ" });

    expect(
      getErrors(
        buildState({
          screen: "w3",
          form: { ...INITIAL_FORM, businessName: "Crown", type: "shop" },
        }),
      ),
    ).toEqual({ address: "Enter your address" });
  });

  it("validates UK mobiles and postcodes", () => {
    expect(isValidMobile("7700 900123")).toBe(true);
    expect(isValidMobile("07700 900123")).toBe(true);
    expect(isValidMobile("12")).toBe(false);
    expect(isPostcodeValid("m14 5tq")).toBe(true);
  });

  it("Back follows the flow; verify returns to the right form", () => {
    expect(getBackScreen(buildState({ screen: "w3" }))).toBe("w2");

    expect(
      getBackScreen(buildState({ screen: "verify", audience: "customer" })),
    ).toBe("cust-create");

    expect(
      getBackScreen(buildState({ screen: "verify", audience: "pro" })),
    ).toBe("w5");
  });
});

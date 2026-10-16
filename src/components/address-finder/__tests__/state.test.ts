import { describe, expect, it } from "vitest";
import {
  getFieldErrors,
  getManualDraft,
  hasAddress,
  toEmittedAddress,
} from "../state";

describe("address finder state", () => {
  it("emits a trimmed address with its district", () => {
    expect(
      toEmittedAddress(
        {
          line1: " 14 Blossom St ",
          line2: "",
          town: "Manchester ",
          postcode: "m46aj",
        },
        "pick",
        {
          line1: "",
          line2: "",
          town: "",
          postcode: "",
          area: "Ancoats",
          location: { lat: 1, lng: 2 },
        },
      ),
    ).toEqual({
      line1: "14 Blossom St",
      line2: "",
      town: "Manchester",
      postcode: "M4 6AJ",
      source: "pick",
      district: "M4",
      lat: 1,
      lng: 2,
      area: "Ancoats",
    });
  });

  it("an unreal postcode is passed on upper-cased, with no district", () => {
    const emitted = toEmittedAddress({
      line1: "1 A St",
      line2: "",
      town: "Leeds",
      postcode: " m4 ",
    });

    expect(emitted).toMatchObject({
      postcode: "M4",
      district: "",
      source: "manual",
      lat: null,
    });
  });

  it("the manual form starts from what was typed", () => {
    expect(getManualDraft(null, "m46aj").postcode).toBe("M4 6AJ");
    expect(getManualDraft(null, " 14 Blossom ").line1).toBe("14 Blossom");
    expect(getManualDraft(null, "M4 6").line1).toBe("");
  });

  it("the manual form starts from the summary when there is one", () => {
    const sum = {
      line1: "1 A St",
      line2: "",
      town: "Leeds",
      postcode: "LS1 1AA",
    };

    expect(getManualDraft(sum, "anything")).toEqual(sum);
  });

  it("checks the manual fields", () => {
    expect(
      getFieldErrors({ line1: "", line2: "", town: " ", postcode: "M4" }),
    ).toEqual({
      line1: "Enter the first line of the address",
      line2: "",
      town: "Enter a town or city",
      postcode: "Enter a real UK postcode, like M4 6AJ",
    });
  });

  it("an address needs a first line or a postcode", () => {
    expect(hasAddress(null)).toBe(false);
    expect(hasAddress({ town: "Leeds" })).toBe(false);
    expect(hasAddress({ postcode: "LS1" })).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { getStylist } from "../booking-state";
import { getClosedLine, getWhenLine } from "../booking-calendar";
import { getPreviewIndex, hasPreview, PREVIEW_POOL } from "../booking-content";
import {
  formatCardNumber,
  formatExpiry,
  getAddressCheck,
  getCardBrand,
  getCardError,
  getEmailFix,
  getFieldErrors,
} from "../booking-details";
import { getDeltaLabel } from "../booking-pricing";

describe("details validation", () => {
  it("flags every empty contact field and a non-UK mobile", () => {
    const empty = { first: "", last: "", email: "", phone: "", notes: "" };

    expect(Object.keys(getFieldErrors(empty, true, false))).toEqual([
      "address",
      "first",
      "last",
      "email",
      "phone",
    ]);

    expect(
      getFieldErrors(
        {
          first: "Nia",
          last: "Okafor",
          email: "nia@gmail.com",
          phone: "+44 7700 900123",
          notes: "",
        },
        false,
        false,
      ),
    ).toEqual({});
  });

  it("suggests the fixed email domain", () => {
    expect(getEmailFix("nia.okafor@gmial.com")).toBe("nia.okafor@gmail.com");
    expect(getEmailFix("nia.okafor@gmail.com")).toBe("");
  });

  it("checks a mobile stylist's travel area by postcode district", () => {
    const stylist = getStylist("amara-beauty");
    const base = { line2: "", notes: "", source: "pick" };

    expect(
      getAddressCheck(stylist, {
        ...base,
        line1: "12 Dickenson Road",
        town: "Manchester",
        postcode: "M14 5TQ",
      }).inArea,
    ).toBe(true);

    expect(
      getAddressCheck(stylist, {
        ...base,
        line1: "12 Chorley New Road",
        town: "Bolton",
        postcode: "bl14qr",
      }),
    ).toMatchObject({ outBlock: true, postcodeLabel: "BL1 4QR" });
  });
});

describe("card fields", () => {
  it("formats card numbers, Amex 4-6-5", () => {
    expect(formatCardNumber("4242424242424242999")).toBe("4242 4242 4242 4242");
    expect(formatCardNumber("378282246310005")).toBe("3782 822463 10005");
    expect(getCardBrand("5555")).toBe("Mastercard");
  });

  it("formats expiry and reports the first problem", () => {
    expect(formatExpiry("929")).toBe("09 / 29");

    const card = {
      number: "4242 4242 4242 4242",
      expiry: "12 / 29",
      cvc: "123",
      name: "Nia",
      postcode: "M14 5TQ",
    };

    expect(getCardError(card)).toBe("");

    expect(getCardError({ ...card, expiry: "13 / 29" })).toBe(
      "Check the expiry date.",
    );

    expect(getCardError({ ...card, postcode: "M1" })).toBe(
      "Add your billing postcode.",
    );
  });
});

describe("labels", () => {
  it("formats option deltas with a real minus sign", () => {
    expect(getDeltaLabel({ priceDelta: 10, minutesDelta: 30 })).toBe("+£10");

    expect(getDeltaLabel({ priceDelta: -5, minutesDelta: -30 }, true)).toBe(
      "−£5 −30m",
    );
  });

  it("names the closed weekdays and the chosen time", () => {
    expect(getClosedLine(getStylist("tiwaras-house"))).toMatch(
      /^( Closed .+\.)?$/,
    );

    expect(getWhenLine(2026, 9, null, null)).toBe("Not chosen yet");
    expect(getWhenLine(2026, 9, 14, "10:30")).toBe("Wed 14 Oct · 10:30");
  });

  it("picks the knotless render for length and colour", () => {
    const index = getPreviewIndex("Waist", "613 Blonde");

    expect(PREVIEW_POOL[index]).toBe("ai-preview/ai-knotless-waist-613.webp");

    expect(PREVIEW_POOL[getPreviewIndex("Bra", "Other")]).toBe(
      "ai-preview/ai-knotless-bra-1b.webp",
    );

    expect(hasPreview(["Shoulder", "Waist"])).toBe(false);
  });
});

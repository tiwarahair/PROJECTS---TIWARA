import { describe, expect, it } from "vitest";
import { INITIAL_FORM } from "../state";
import { getStylistDetails, getWelcomeMessage } from "../submit-logic";

const LOCATION = {
  pinLatLng: null,
  geocodedLatLng: [53.4, -2.2] as [number, number],
  area: "Rusholme",
};

describe("getWelcomeMessage", () => {
  it("welcomes new and returning customers, with their first name when known", () => {
    expect(getWelcomeMessage("customer-new", "Nia")).toBe(
      "Welcome to Tiwára’s House, Nia",
    );

    expect(getWelcomeMessage("customer-login", "")).toBe("Welcome back");
  });
});

describe("getStylistDetails", () => {
  it("uses the pin before the geocoded point and the account contact when asked", () => {
    const details = getStylistDetails(
      { ...INITIAL_FORM, useContact: true, email: "a@b.co", mobile: "7700" },
      { ...LOCATION, pinLatLng: [51.5, -0.1] },
    );

    expect(details).toMatchObject({
      lat: 51.5,
      lng: -0.1,
      areaLabel: "Rusholme",
      contactEmail: "a@b.co",
      contactPhone: "7700",
    });
  });

  it("only mobile stylists have a travel radius, and Other uses the typed source", () => {
    const details = getStylistDetails(
      {
        ...INITIAL_FORM,
        type: "mobile",
        radius: 5,
        useContact: false,
        businessEmail: "",
        referralSource: "Other",
        referralSourceOther: "A friend",
      },
      LOCATION,
    );

    expect(details).toMatchObject({
      travelRadiusMiles: 5,
      contactEmail: null,
      referralSource: "A friend",
    });
  });

  it("throws without a location", () => {
    expect(() =>
      getStylistDetails(INITIAL_FORM, { ...LOCATION, geocodedLatLng: null }),
    ).toThrow("The business location is missing");
  });
});

import { describe, expect, it } from "vitest";
import {
  STYLISTS,
  findStylist,
  getOfferedServices,
  getOfferedStyles,
  getStyleRate,
  getStylistStyles,
} from "./stylist";
import { SERVICES, getIndividualService } from "../services/services";

const serviceIds = (stylistId: string | null) =>
  getOfferedServices(stylistId).map(({ id }) => id);

describe("getOfferedServices", () => {
  it("offers the whole catalogue when there is no stylist yet", () => {
    expect(serviceIds(null)).toEqual(SERVICES.map(({ id }) => id));
  });

  it("offers only what the stylist has priced up", () => {
    // Amara does wigs, natural hair and treatments — no braids, no locs.
    expect(serviceIds("amara")).toEqual(["wigs", "natural-hair", "treatments"]);
  });

  it("keeps catalogue order regardless of the order in the stylist record", () => {
    const catalogueOrder = SERVICES.map(({ id }) => id);
    for (const { id } of STYLISTS) {
      const offered = serviceIds(id);
      expect(offered).toEqual(
        catalogueOrder.filter((s) => offered.includes(s)),
      );
    }
  });

  it("falls back to the catalogue for a stylist that does not exist", () => {
    expect(serviceIds("nobody")).toEqual(SERVICES.map(({ id }) => id));
  });
});

describe("getOfferedStyles", () => {
  it("lists the styles the stylist prices within a service", () => {
    const offered = getOfferedStyles("amara", "wigs").map(({ id }) => id);
    const priced = Object.keys(findStylist("amara")!.services.wigs);

    expect(offered).toEqual(expect.arrayContaining(priced));
    expect(offered).toHaveLength(priced.length);
  });

  it("returns nothing for a service the stylist does not offer", () => {
    expect(getOfferedStyles("amara", "braids")).toEqual([]);
  });
});

describe("getStyleRate", () => {
  it("takes the stylist's own rate when there is one", () => {
    expect(getStyleRate("knotless", "braids", "tiwara")).toEqual(
      findStylist("tiwara")!.services.braids.knotless,
    );
  });

  it("falls back to the catalogue when no stylist is chosen", () => {
    const { defaultPrice, defaultDuration } = getIndividualService(
      "knotless",
      "braids",
    )!;

    expect(getStyleRate("knotless", "braids", null)).toEqual({
      price: defaultPrice,
      duration: defaultDuration,
    });
  });

  it("falls back to the catalogue for a style the stylist has not priced", () => {
    expect(getStyleRate("knotless", "braids", "amara")).toEqual(
      getStyleRate("knotless", "braids", null),
    );
  });

  it("costs nothing when no style is chosen", () => {
    expect(getStyleRate(null, "braids", "tiwara")).toEqual({
      price: 0,
      duration: "",
    });
  });
});

describe("getStylistStyles", () => {
  it("flattens every service into bookable, priced rows", () => {
    const rows = getStylistStyles("amara");
    const expected = Object.values(findStylist("amara")!.services).flatMap(
      (styles) => Object.keys(styles),
    );

    expect(rows).toHaveLength(expected.length);
    expect(rows.every(({ label }) => label.length > 0)).toBe(true);
  });

  it("carries the service each style belongs to, so a row can start a booking", () => {
    const [first] = getStylistStyles("amara");

    expect(first).toMatchObject({ serviceId: "wigs" });
    expect(getOfferedStyles("amara", "wigs").map(({ id }) => id)).toContain(
      first!.styleId,
    );
  });
});

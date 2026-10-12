import { describe, expect, it } from "vitest";
import {
  getResults,
  getPlace,
  getResultCards,
  getStyleSelection,
  toDayMinutes,
} from "../search-logic";
import { getFixturePatch } from "../search-fixtures";
import { getInitialState, getStateSearch } from "../search-state";

const stateFor = (search: string) => getInitialState(search, 1440);

describe("search state", () => {
  it("parses the URL, including legacy service, venues, price, distance and sort aliases", () => {
    const state = stateFor(
      "?service=braids&venue=salon,mobile,bogus&maxPrice=80&dist=15&sort=soonest&time=9am-5pm",
    );

    expect(state.query).toEqual({
      group: "braids",
      type: "",
      date: "",
      location: "Current location",
      freeText: "",
    });

    expect(state.venues).toEqual(["Salon", "Mobile"]);
    expect(state.maxPrice).toBe(80);
    expect(state.radius).toBe(15);
    expect(state.sort).toBe("earliest");

    expect([state.time, state.customFrom, state.customTo]).toEqual([
      "custom",
      "9am",
      "5pm",
    ]);
  });

  it("ignores out-of-range price and distance", () => {
    const state = stateFor("?maxPrice=300&dist=7");

    expect(state.maxPrice).toBeNull();
    expect(state.radius).toBe(10);
  });

  it("writes the URL back in a fixed parameter order", () => {
    expect(
      getStateSearch(
        stateFor("?service=braids&loc=Chorlton&venue=salon&sort=price"),
      ),
    ).toBe("?group=braids&loc=Chorlton&venue=salon&sort=price");

    expect(getStateSearch(stateFor(""))).toBe("");
  });

  it("maps board fixtures, mobile ones to the sheet", () => {
    const state = stateFor("");

    expect(getFixturePatch("what-knot", state, false)).toMatchObject({
      whatOpen: true,
      whatText: "knot",
      whatTyped: true,
    });

    expect(getFixturePatch("what-knot", state, true)).toMatchObject({
      mobileView: "service",
    });

    expect(getFixturePatch("price-open", state, true)).toMatchObject({
      filtersOpen: true,
      filtersDraft: { maxPrice: 80 },
    });

    expect(getFixturePatch("nope", state, false)).toBeNull();
  });
});

describe("search logic", () => {
  it("resolves places, defaulting to the city centre", () => {
    expect(getPlace("Current location")).toMatchObject({
      name: "Manchester city centre",
      current: true,
    });

    expect(getPlace("chor").name).toBe("Chorlton");
    expect(getPlace("Nowhere").name).toBe("Manchester city centre");
  });

  it("describes the style selection", () => {
    expect(getStyleSelection(stateFor("?type=knotless-braids"))).toMatchObject({
      name: "Knotless braids",
      isGroup: false,
      has: true,
    });

    expect(getStyleSelection(stateFor("?group=locs"))).toMatchObject({
      display: "Locs",
      isGroup: true,
    });

    expect(getStyleSelection(stateFor("?q=silk")).name).toBe("‘silk’");
  });

  it("converts 12-hour times", () => {
    expect([
      toDayMinutes("8am"),
      toDayMinutes("12pm"),
      toDayMinutes("12am"),
      toDayMinutes("6pm"),
    ]).toEqual([480, 720, 0, 1080]);
  });

  it("filters by style, venue and price, and sorts mobile stylists as 0 miles", () => {
    const all = getResults(stateFor("")).list;

    expect(all.length).toBeGreaterThan(0);

    const firstMobile = all.findIndex(
      ({ stylist }) => stylist.businessType === "mobile",
    );

    expect(firstMobile).toBe(0);
    const salons = getResults(stateFor("?venue=salon")).list;

    expect(
      salons.every(({ stylist }) =>
        ["shop", "chairRental"].includes(stylist.businessType),
      ),
    ).toBe(true);

    const cheap = getResults(stateFor("?maxPrice=40")).list;

    expect(cheap.every(({ price }) => price <= 40)).toBe(true);
    const locs = getResults(stateFor("?group=locs")).list;

    expect(locs.map(({ stylist }) => stylist.id)).toEqual(["locd-and-lovely"]);
  });

  it("sorts by price low to high and high to low, keeping the URL param", () => {
    const getPrices = (search: string) =>
      getResults(stateFor(search)).list.map(({ price }) => price);

    const ascending = getPrices("?sort=price");
    const descending = getPrices("?sort=price-desc");

    expect(ascending.length).toBeGreaterThan(1);

    expect(ascending).toEqual(
      [...ascending].sort((left, right) => left - right),
    );

    expect(descending).toEqual(
      [...descending].sort((left, right) => right - left),
    );

    expect(getStateSearch(stateFor("?sort=price-desc"))).toBe(
      "?sort=price-desc",
    );
  });

  it("builds result cards with facts and service rows when a style is chosen", () => {
    const state = stateFor("?group=locs");
    const { list, selection } = getResults(state);
    const [card] = getResultCards(list, selection);

    expect(card?.href).toBe("/stylist?stylist=locd-and-lovely");

    expect(card?.rows[0]?.href).toMatch(
      /^\/book\?stylist=locd-and-lovely&service=/,
    );

    expect(card?.facts[0]?.text).toMatch(/miles? away|Under 1 mile away/);
  });
});

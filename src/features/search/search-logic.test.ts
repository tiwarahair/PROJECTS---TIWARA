import { describe, expect, it } from "vitest";
import {
  calcResults,
  getPlace,
  getResultCards,
  getStyleSelection,
  toDayMinutes,
} from "./search-logic";
import {
  getFixturePatch,
  getInitialState,
  getStateSearch,
} from "./search-state";

const stateFor = (search: string) => getInitialState(search, 1440);

describe("search state", () => {
  it("parses the URL like the prototype (legacy service, venues, price, distance, sort aliases)", () => {
    const state = stateFor(
      "?service=braids&venue=salon,mobile,bogus&maxPrice=80&dist=15&sort=soonest&time=9am-5pm",
    );
    expect(state.q).toEqual({
      group: "braids",
      type: "",
      date: "",
      loc: "Current location",
      qq: "",
    });
    expect(state.venues).toEqual(["Salon", "Mobile"]);
    expect(state.maxPrice).toBe(80);
    expect(state.radius).toBe(15);
    expect(state.sort).toBe("earliest");
    expect([state.time, state.cFrom, state.cTo]).toEqual([
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

  it("writes the URL back in the prototype's order", () => {
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
      mob: "service",
    });
    expect(getFixturePatch("price-open", state, true)).toMatchObject({
      fOpen: true,
      fDraft: { maxPrice: 80 },
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
    const all = calcResults(stateFor("")).list;
    expect(all.length).toBeGreaterThan(0);
    const firstMobile = all.findIndex(({ st }) => st.businessType === "mobile");
    expect(firstMobile).toBe(0);
    const salons = calcResults(stateFor("?venue=salon")).list;
    expect(
      salons.every(({ st }) =>
        ["shop", "chairRental"].includes(st.businessType),
      ),
    ).toBe(true);
    const cheap = calcResults(stateFor("?maxPrice=40")).list;
    expect(cheap.every(({ price }) => price <= 40)).toBe(true);
    const locs = calcResults(stateFor("?group=locs")).list;
    expect(locs.map(({ st }) => st.id)).toEqual(["locd-and-lovely"]);
  });

  it("builds result cards with facts and service rows when a style is chosen", () => {
    const state = stateFor("?group=locs");
    const { list, selection } = calcResults(state);
    const [card] = getResultCards(list, selection);
    expect(card?.href).toBe("/stylist?stylist=locd-and-lovely");
    expect(card?.rows[0]?.href).toMatch(
      /^\/book\?stylist=locd-and-lovely&service=/,
    );
    expect(card?.facts[0]?.text).toMatch(/miles? away|Under 1 mile away/);
  });
});

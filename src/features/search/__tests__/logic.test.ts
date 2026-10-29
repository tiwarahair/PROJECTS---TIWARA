import { describe, expect, it } from "vitest";
import {
  getPlace,
  getStyleSelection,
  toDayMinutes,
  toSearchArgs,
} from "../logic";
import { getInitialState, getStateSearch } from "../state";
import { TEST_CATALOGUE } from "../../../test/catalogue";

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
      lat: null,
      lng: null,
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
        stateFor(
          "?service=braids&loc=Chorlton&ll=53.44,-2.27&venue=salon&sort=price",
        ),
      ),
    ).toBe(
      "?group=braids&loc=Chorlton&ll=53.4400%2C-2.2700&venue=salon&sort=price",
    );

    expect(getStateSearch(stateFor("?loc=Chorlton"))).toBe("");

    expect(getStateSearch(stateFor(""))).toBe("");
  });
});

describe("search logic", () => {
  it("uses a typed area's point, or the device's for Current location", () => {
    const position = { lat: 53.48, lng: -2.24 };

    expect(getPlace(stateFor("").query, position)).toEqual({
      name: "Current location",
      current: true,
      point: position,
    });

    expect(
      getPlace(stateFor("?loc=Chorlton&ll=53.44,-2.27").query, position),
    ).toEqual({
      name: "Chorlton",
      current: false,
      point: { lat: 53.44, lng: -2.27 },
    });
  });

  it("describes the style selection", () => {
    expect(
      getStyleSelection(stateFor("?type=knotless-braids"), TEST_CATALOGUE),
    ).toMatchObject({
      name: "Knotless braids",
      isGroup: false,
      has: true,
    });

    expect(
      getStyleSelection(stateFor("?group=locs"), TEST_CATALOGUE),
    ).toMatchObject({
      display: "Locs",
      isGroup: true,
    });

    expect(getStyleSelection(stateFor("?q=silk"), TEST_CATALOGUE).name).toBe(
      "‘silk’",
    );
  });

  it("converts 12-hour times", () => {
    expect([
      toDayMinutes("8am"),
      toDayMinutes("12pm"),
      toDayMinutes("12am"),
      toDayMinutes("6pm"),
    ]).toEqual([480, 720, 0, 1080]);
  });

  it("names a retired style in the URL, and waits for the catalogue to name one", () => {
    const catalogue = {
      ...TEST_CATALOGUE,
      types: TEST_CATALOGUE.types.map((type) => ({ ...type, isActive: false })),
    };

    expect(
      getStyleSelection(stateFor("?type=box-braids"), catalogue),
    ).toMatchObject({ name: "Box braids", isPending: false });

    expect(
      getStyleSelection(stateFor("?type=box-braids"), undefined),
    ).toMatchObject({ has: false, isPending: true });

    expect(getStyleSelection(stateFor(""), undefined).isPending).toBe(false);
  });

  it("turns the state into search_stylists arguments", () => {
    const state = stateFor(
      "?group=locs&venue=salon,mobile&maxPrice=80&dist=15&date=2026-10-20&time=9am-5pm&sort=price",
    );

    expect(
      toSearchArgs(state, { lat: 53.48, lng: -2.24 }, TEST_CATALOGUE),
    ).toEqual({
      lat: 53.48,
      lng: -2.24,
      radius_miles: 15,
      service_type: undefined,
      service_group: "locs",
      search_text: undefined,
      venues: ["shop", "chair_rental", "mobile"],
      max_price_pence: 8000,
      on_date: "2026-10-20",
      time_from: "09:00",
      time_to: "17:00",
      sort: "price",
    });
  });

  it("the filter sheet's draft overrides venues, price, distance and sort", () => {
    const args = toSearchArgs(stateFor("?maxPrice=80"), null, TEST_CATALOGUE, {
      venues: ["Home-based"],
      maxPrice: null,
      radius: 25,
      sort: "earliest",
    });

    expect(args).toMatchObject({
      venues: ["home_based"],
      max_price_pence: undefined,
      radius_miles: 25,
      sort: "earliest",
    });
  });
});

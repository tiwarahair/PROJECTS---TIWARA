import { describe, expect, it } from "vitest";
import { TEST_CATALOGUE } from "../../../test/catalogue";
import { fakeSearch } from "../../../test/search-rows";
import { toResultCards } from "../cards";
import { getStyleSelection } from "../logic";
import { getInitialState } from "../state";

const selectionFor = (search: string) =>
  getStyleSelection(getInitialState(search, 1440), TEST_CATALOGUE);

describe("result cards", () => {
  it("link to the profile and show the fee-inclusive price, distance and next opening", async () => {
    const [card] = toResultCards(await fakeSearch({}), selectionFor(""));

    expect(card).toMatchObject({
      href: "/naturallynia",
      from: 30.95,
      meta: "From £30.95",
      rows: [],
    });

    expect(card?.facts[0]?.text).toBe("1.4 miles away");
    expect(card?.facts[1]?.text).toMatch(/^Next available: /);
  });

  it("list the matching services when a style is chosen", async () => {
    const [card] = toResultCards(await fakeSearch({}), selectionFor("?q=silk"));

    expect(card?.rows).toEqual([
      {
        name: "Silk press",
        meta: "from £30.95 · 1h 30m",
        href: "/book?stylist=naturallynia&service=naturallynia-service",
      },
    ]);
  });

  it("mobile stylists travel to you; no point means no distance", async () => {
    const [row] = await fakeSearch({});

    if (!row) throw new Error("no fixture rows");

    const [mobile, unknown] = toResultCards(
      [
        { ...row, business_type: "mobile" },
        { ...row, distance_miles: null },
      ],
      selectionFor(""),
    );

    expect(mobile?.facts[0]?.text).toBe("Travels to you");
    expect(unknown?.facts[0]?.text).toMatch(/^Next available: /);
  });
});

import { describe, expect, it } from "vitest";
import { serviceTypes } from "../../../../../data";
import { getSuggestionFill } from "../suggestion-fill";

const getType = (id: string) => {
  const type = serviceTypes.find((item) => item.id === id);

  if (!type) throw new Error(`no service type ${id}`);

  return type;
};

describe("services → suggestion fill", () => {
  it("fills the name, type and options from a suggested type", () => {
    const fill = getSuggestionFill(getType("knotless-braids"));

    expect(fill).toMatchObject({
      name: "Knotless braids",
      subcategory: "Knotless braids",
      typeId: "knotless-braids",
      taxonomyId: "braids",
      sizesOn: true,
      lengthsOn: true,
    });

    expect(fill.addonDefinitions.length).toBeGreaterThan(0);
  });

  it("signs both deltas of a smaller option", () => {
    const { sizes } = getSuggestionFill(getType("knotless-braids"));

    expect(sizes.find(({ label }) => label === "Large")).toEqual({
      label: "Large",
      on: true,
      negative: true,
      priceDelta: "-10",
      hoursDelta: "0",
      minutesDelta: "-30",
    });

    expect(sizes.find(({ label }) => label === "Medium")).toMatchObject({
      negative: false,
      priceDelta: "0",
      hoursDelta: "0",
      minutesDelta: "0",
    });
  });
});

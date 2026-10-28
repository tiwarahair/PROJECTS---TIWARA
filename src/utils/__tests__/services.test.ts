import { describe, expect, it } from "vitest";
import { TEST_CATALOGUE } from "../../test/catalogue";
import { getSpec } from "../services";

const getType = (id: string) => {
  const type = TEST_CATALOGUE.types.find((item) => item.id === id);

  if (!type) throw new Error(`no service type ${id}`);

  return type;
};

describe("getSpec", () => {
  it("uses the type's own duration, price and description", () => {
    expect(getSpec(getType("knotless-braids"))).toEqual({
      minutes: 240,
      addedPrice: 85,
      description: "Small to medium · back length · hair included",
    });
  });

  it("makes up the same defaults every time for a type without any", () => {
    const other = getType("other-braids");

    expect(getSpec(other)).toEqual(getSpec(other));

    expect(getSpec(other)).toMatchObject({
      description: "Consultation included · message for options",
    });
  });
});

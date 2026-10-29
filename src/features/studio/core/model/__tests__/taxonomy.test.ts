import { describe, expect, it } from "vitest";
import { TEST_CATALOGUE } from "../../../../../test/catalogue";
import { findServiceType, getTaxonomy } from "../taxonomy";

const catalogue = {
  ...TEST_CATALOGUE,
  types: TEST_CATALOGUE.types.map((type) =>
    type.id === "box-braids" ? { ...type, isActive: false } : type,
  ),
};

describe("taxonomy", () => {
  it("offers only the types still in use", () => {
    const braids = getTaxonomy({ catalogue }, "braids");

    expect(braids?.types.map(({ id }) => id)).not.toContain("box-braids");
    expect(braids?.subcategories).not.toContain("Box braids");
    expect(braids?.subcategories).toContain("Knotless braids");
  });

  it("still finds a retired type for a service that has it", () => {
    const service = {
      typeId: "box-braids",
      taxonomyId: "braids",
      subcategory: "Box braids",
    };

    expect(findServiceType(service, catalogue.types)?.name).toBe("Box braids");
  });
});

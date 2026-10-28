import { describe, expect, it } from "vitest";
import { TEST_CATALOGUE } from "../../../test/catalogue";
import type { Catalogue } from "../../../types/catalogue";
import { getStyleSelection } from "../logic";
import { getInitialState } from "../state";
import { getWhatModel } from "../suggestions";

const getStyleLabels = (catalogue: Catalogue) => {
  const state = {
    ...getInitialState("", 1440),
    whatTyped: true,
    whatText: "braids",
  };

  const { flat } = getWhatModel(
    state,
    getStyleSelection(state, catalogue),
    { rows: [], isLoading: false, isSlow: false },
    catalogue,
  );

  return flat.map(({ label }) => label);
};

describe("What suggestions", () => {
  it("leave out retired styles", () => {
    expect(getStyleLabels(TEST_CATALOGUE)).toContain("Box braids");

    const retired = {
      ...TEST_CATALOGUE,
      types: TEST_CATALOGUE.types.map((type) =>
        type.id === "box-braids" ? { ...type, isActive: false } : type,
      ),
    };

    expect(getStyleLabels(retired)).not.toContain("Box braids");
    expect(getStyleLabels(retired)).toContain("Knotless braids");
  });
});

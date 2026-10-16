import { getCategoryNameError } from "../model";
import type { FixtureTable } from "./context";

export const categoryFixtures: FixtureTable = {
  "svc-cats": ({ toServices }) => toServices(),
  "cats-sheet": ({ toServices, serviceActions }) => {
    toServices();
    window.setTimeout(() => serviceActions.openCategories(), 60);
  },
  "cats-dup": ({ toServices, serviceActions, context }) => {
    const { getState, setState } = context;

    toServices();

    window.setTimeout(() => {
      serviceActions.openCategories();

      setState(({ categoriesUi }) =>
        categoriesUi
          ? {
              categoriesUi: {
                ...categoriesUi,
                newName: "locs",
                newError: getCategoryNameError(getState(), "locs"),
              },
            }
          : {},
      );
    }, 80);
  },
};

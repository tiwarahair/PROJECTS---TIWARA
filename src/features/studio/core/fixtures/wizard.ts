import { getTaxonomy, makeVariationRows } from "../../services/actions";
import { getNextCategoryColour } from "../model";
import { withServices } from "./context";
import type { FixtureTable } from "./context";
import { getPartingOptions } from "./data";

export const wizardFixtures: FixtureTable = {
  "wiz-details": (fixture) =>
    withServices(fixture, () => {
      const { openWizard, setWizard } = fixture.serviceActions;
      const braids = getTaxonomy("braids");

      openWizard("add", null, {
        categoryId: "c1",
        taxonomyId: "braids",
        subcategory: "Box braids",
        typeId: "box-braids",
        name: "Jumbo box braids",
        sizes: makeVariationRows(braids?.sizes),
        lengths: makeVariationRows(braids?.lengths),
      });

      setWizard({ step: 2 });
    }),
  "wiz-newcat": (fixture) =>
    withServices(fixture, () => {
      fixture.serviceActions.openWizard("add", null, {
        taxonomyId: "braids",
        subcategory: "Box braids",
        typeId: "box-braids",
        name: "Jumbo box braids",
      });

      fixture.context.setState(({ wizard, categories }) =>
        wizard
          ? {
              wizard: {
                ...wizard,
                step: 2,
                newCategory: {
                  name: "",
                  colour: getNextCategoryColour(categories),
                  error: "",
                },
              },
            }
          : {},
      );
    }),
  "wiz-own": (fixture) =>
    withServices(fixture, () => {
      const { openWizard, setWizard } = fixture.serviceActions;

      openWizard("edit", fixture.knotless());
      setWizard({ step: 3 });
    }),
  "wiz-own-edit": (fixture) =>
    withServices(fixture, () => {
      const { openWizard, setWizard } = fixture.serviceActions;

      openWizard("edit", fixture.knotless());

      setWizard({
        step: 3,
        ownEdit: {
          index: 0,
          name: "Parting",
          options: getPartingOptions().slice(0, 2),
          error: "",
        },
      });
    }),
  "wiz-search": (fixture) =>
    withServices(fixture, () => {
      const { openWizard, setWizard } = fixture.serviceActions;

      openWizard("add");
      setWizard({ suggestionsOpen: true, search: "retwist" });
    }),
};

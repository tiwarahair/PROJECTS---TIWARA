import { serviceTypes } from "../../../../data";
import type { WizardState } from "../types";
import { withServices } from "./context";
import type { FixtureContext, FixtureTable } from "./context";

const SUGGESTION_PANELS: Record<string, Partial<WizardState>> = {
  sugg: { suggestionsOpen: true },
  "sugg-group": { suggestionsOpen: true, categoryFilter: "locs" },
  "sugg-none": { suggestionsOpen: true, search: "mohawk fade" },
};

const FILLED_STEPS: Record<string, number | null> = {
  "wiz-filled": null,
  "wiz-filled-pricing": 3,
  "wiz-filled-addons": 4,
};

const openNewWizard = (fixture: FixtureContext) =>
  withServices(fixture, () => {
    const { key, serviceActions } = fixture;

    const { openWizard, setWizard, setDraft, applySuggestion, pickSuggestion } =
      serviceActions;

    openWizard("add");
    const type = serviceTypes.find(({ id }) => id === "knotless-braids");
    const panel = SUGGESTION_PANELS[key];

    if (panel) setWizard(panel);

    if (!type) return;

    if (key in FILLED_STEPS) {
      const step = FILLED_STEPS[key];

      applySuggestion(type, true, key === "wiz-filled");

      if (step) window.setTimeout(() => setWizard({ step }), 50);
    }

    if (key === "wiz-replace") {
      setDraft({ name: "My knotless" });
      window.setTimeout(() => pickSuggestion(type), 60);
    }
  });

export const suggestionFixtures: FixtureTable = {
  "wiz-new": openNewWizard,
  sugg: openNewWizard,
  "sugg-group": openNewWizard,
  "sugg-none": openNewWizard,
  "wiz-filled": openNewWizard,
  "wiz-filled-pricing": openNewWizard,
  "wiz-filled-addons": openNewWizard,
  "wiz-replace": openNewWizard,
};

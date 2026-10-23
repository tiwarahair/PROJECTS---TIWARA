import type { StudioController } from "../../../core/use-studio";
import { getWizardView } from "../view";
import { CustomisationDialog } from "./customisation";
import { NewAddonDialog } from "./new-addon";
import { SuggestionsDialog } from "./suggestions";

/** The wizard's dialogs, rendered in order with the page's other dialogs. */
export const WizardNewAddonDialog = ({
  studio,
}: {
  studio: StudioController;
}) => {
  const view = getWizardView(studio);

  return view ? <NewAddonDialog view={view} /> : null;
};

export const WizardSuggestionDialogs = ({
  studio,
}: {
  studio: StudioController;
}) => {
  const view = getWizardView(studio);

  return view ? (
    <>
      <SuggestionsDialog view={view} />
      <CustomisationDialog view={view} />
    </>
  ) : null;
};

// The Add / Edit service wizard: steps, details, pricing, suggestions, footer.
import type { StudioController } from "../../core/use-studio";
import { getWizardAddons } from "./addons-view";
import { getContext } from "./context";
import { getDetailsView } from "./details-view";
import { getOwnEditor } from "./own-view";
import { getPriceView } from "./price-view";
import { getReviewView } from "./review-view";
import { getFooterView, getStepsView } from "./steps-view";
import { getSuggestionsView } from "./suggestions-view";
import { getVariationsView } from "./variations-view";

export const getWizardView = (studio: StudioController) => {
  const context = getContext(studio);

  if (!context) return null;

  const { wizard, draft, base } = context;

  return {
    wizard,
    draft,
    ...getStepsView(context),
    // suggestions dialog
    ...getSuggestionsView(context),
    // details
    ...getDetailsView(context),
    // pricing
    ...getPriceView(context),
    ...getVariationsView(context),
    own: getOwnEditor(studio, wizard, base),
    ...getReviewView(context),
    // add-ons
    addons: getWizardAddons(studio, wizard),
    // footer
    ...getFooterView(context),
    isWide: studio.isWide,
  };
};

export type WizardView = NonNullable<ReturnType<typeof getWizardView>>;

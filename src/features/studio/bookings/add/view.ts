// The "New booking" sheet's values and actions.
import type { StudioController } from "../../core/use-studio";
import { getAddonsView } from "./addons-view";
import { getClientView } from "./client-view";
import { getContext } from "./context";
import { getDetailsView } from "./details-view";
import { getProtectionView } from "./protection-view";
import { getServiceEditView } from "./service-edit-view";
import { getServiceListView } from "./service-list-view";
import { getStepsView } from "./steps-view";
import { getWhenView } from "./when-view";

/** New booking: who, service (+ edit / add-ons), when, protection, notes. */
export const getAddBookingView = (studio: StudioController) => {
  const context = getContext(studio);

  return {
    ...getStepsView(context),
    // step 1
    ...getClientView(context),
    // step 2
    ...getServiceListView(context),
    ...getServiceEditView(context),
    ...getAddonsView(context),
    // step 3
    ...getWhenView(context),
    // step 4
    ...getProtectionView(context),
    // step 5
    ...getDetailsView(context),
  };
};

export type AddBookingView = ReturnType<typeof getAddBookingView>;

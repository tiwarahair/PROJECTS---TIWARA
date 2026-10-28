// Services, add-ons, categories and the service wizard's actions.
import type { StudioActions, StudioContext } from "../../core/actions";
import { createBookingEditActions } from "./booking-edit";
import { createCategoryActions } from "./categories";
import { createMenuActions } from "./menus";
import { createSuggestionActions } from "./suggestions";
import { createWizardActions } from "./wizard";

export { getAnchor, getBlankAddon, makeVariationRows } from "./helpers";

export const createServiceActions = (
  context: StudioContext,
  actions: StudioActions,
) => {
  const wizard = createWizardActions(context, actions);

  return {
    ...createCategoryActions(context, actions),
    ...wizard,
    ...createSuggestionActions(context, actions, wizard),
    ...createMenuActions(context, actions, wizard),
    ...createBookingEditActions(context),
  };
};

export type ServiceActions = ReturnType<typeof createServiceActions>;

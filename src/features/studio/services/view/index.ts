// Studio → Services values: service groups, add-on groups, the category rows / chips and filters.
import type { StudioController } from "../../core/use-studio";
import { getAddonGroups } from "./addon-groups";
import { getCategories } from "./categories";
import { getContext } from "./context";
import { getServiceGroups } from "./service-groups";
import { getAddView, getStatusView } from "./toolbar";

export type { ListGroup } from "./context";

export const getServicesView = (studio: StudioController) => {
  const context = getContext(studio);
  const { state, isAddons } = context;
  const serviceGroups = getServiceGroups(context);
  const addonGroups = getAddonGroups(context);

  return {
    isAddons,
    serviceGroups,
    addonGroups,
    isAddonsEmpty: state.addons.length === 0,
    isAddonResultsEmpty: state.addons.length > 0 && addonGroups.length === 0,
    isServiceResultsEmpty:
      state.services.length > 0 && serviceGroups.length === 0,
    ...getStatusView(context),
    categories: getCategories(context),
    ...getAddView(context),
  };
};

export type ServicesView = ReturnType<typeof getServicesView>;

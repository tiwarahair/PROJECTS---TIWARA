// The booking's "Edit service" step and its sub-steps: time, duration, extra time,
// price, add-ons, change service, add an add-on and the add-on edit dialog.
import type { DecoratedBooking } from "../decorate";
import type { StudioBooking } from "../../core/types";
import type { StudioController } from "../../core/use-studio";
import {
  getAddonDialogView,
  getAddonRowsView,
  getPickerView,
  getServiceCardView,
} from "./addons";
import { getApplyView } from "./apply";
import { getContext } from "./context";
import { getPriceView } from "./price";
import { getChangeServiceView, getServiceView } from "./service";
import { getTimeView } from "./time";

export { getAddonDialog } from "./addon-dialog";

export const getEditServiceView = (
  studio: StudioController,
  booking: DecoratedBooking,
  patchBooking: (patch: Partial<StudioBooking>) => void,
) => {
  const context = getContext(studio, booking, patchBooking);

  return {
    // view-step service card
    ...getServiceCardView(context),
    // edit step
    ...getServiceView(context),
    ...getTimeView(context),
    ...getPriceView(context),
    ...getAddonRowsView(context),
    ...getApplyView(context),
    // add an add-on
    ...getPickerView(context),
    // change service
    ...getChangeServiceView(context),
    // the add-on edit dialog
    ...getAddonDialogView(context),
  };
};

export type EditServiceView = ReturnType<typeof getEditServiceView>;

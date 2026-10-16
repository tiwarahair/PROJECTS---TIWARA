import type { StudioController } from "../../core/use-studio";
import { getAddBookingView } from "../add/view";
import { AddonEditDialog } from "../dialogs";
import { getAddonDialog, getEditServiceView } from "../edit-view";
import { getBookingSheetView } from "./view";

interface BookingAddonDialogProps {
  studio: StudioController;
}

/** The add-on dialog over Edit service or New booking (rendered with the other dialogs). */
export const BookingAddonDialog = ({ studio }: BookingAddonDialogProps) => {
  const { addonEdit, sheet } = studio.state;

  if (!addonEdit) return null;

  if (addonEdit.context === "add") {
    if (sheet !== "add") return null;

    const dialog = {
      ...getAddonDialog(studio, addonEdit),
      ...getAddBookingView(studio).addonDialog(addonEdit),
    };

    return <AddonEditDialog studio={studio} dialog={dialog} />;
  }

  const view = getBookingSheetView(studio);

  if (!view) return null;

  const { addonDialog } = getEditServiceView(
    studio,
    view.booking,
    view.patchBooking,
  );

  return addonDialog ? (
    <AddonEditDialog studio={studio} dialog={addonDialog} />
  ) : null;
};

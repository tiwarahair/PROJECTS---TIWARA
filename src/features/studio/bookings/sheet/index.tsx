import { joinClassNames } from "../../../../utils/class-names";
import type { StudioController } from "../../core/use-studio";
import { getEditServiceView } from "../edit-view";
import {
  AddonPickerList,
  CancelStep,
  ChangeClientStep,
  ChangeServiceStep,
  EditServiceStep,
  RescheduleStep,
} from "../steps";
import { DoneStep } from "./done";
import { BookingMain } from "./main";
import { PaymentStep } from "./payment";
import type { BookingSheetView } from "./view";
import stepStyles from "../../../../styles/features/studio/bookings/steps/index.module.css";

interface BookingSheetBodyProps {
  studio: StudioController;
  view: BookingSheetView;
}

/** The booking sheet's body for every step. */
export const BookingSheetBody = ({ studio, view }: BookingSheetBodyProps) => {
  const { state } = studio;
  const edit = getEditServiceView(studio, view.booking, view.patchBooking);

  return (
    <>
      {state.bookingStep === "payment" && <PaymentStep view={view} />}
      {view.isMain && <BookingMain studio={studio} view={view} edit={edit} />}
      {state.bookingStep === "done" && <DoneStep studio={studio} view={view} />}
      {state.bookingStep === "editsvc" && (
        <EditServiceStep studio={studio} edit={edit} />
      )}
      {state.bookingStep === "changesvc" && (
        <ChangeServiceStep studio={studio} edit={edit} />
      )}
      {state.bookingStep === "changeclient" && (
        <ChangeClientStep studio={studio} view={view} />
      )}
      {state.bookingStep === "addaddon" && (
        <AddonPickerList
          className={joinClassNames(
            stepStyles.pane,
            state.bookingStepOut && stepStyles.paneOut,
          )}
          picker={edit.picker}
        />
      )}
      {state.bookingStep === "resched" && (
        <RescheduleStep studio={studio} view={view} />
      )}
      {state.bookingStep === "cancel" && (
        <CancelStep studio={studio} view={view} />
      )}
    </>
  );
};

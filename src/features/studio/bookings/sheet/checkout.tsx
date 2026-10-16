import type { StudioController } from "../../core/use-studio";
import { StudioCheckout } from "../checkout";
import type { BookingSheetView } from "./view";

interface BookingCheckoutProps {
  studio: StudioController;
  view: BookingSheetView;
}

/** The embedded checkout over the booking sheet. */
export const BookingCheckout = ({ studio, view }: BookingCheckoutProps) => (
  <StudioCheckout
    studio={studio}
    booking={view.checkoutBooking}
    onExit={() => studio.setState({ bookingStep: "view" })}
    onComplete={(result, action) =>
      view.onCheckoutComplete({ ...result, tip: result.tip ?? 0 }, action)
    }
  />
);

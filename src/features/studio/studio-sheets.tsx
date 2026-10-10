import {
  BookingCheckout,
  BookingSheetAfter,
  BookingSheetBody,
} from "./booking-sheet";
import { getBookingSheetView } from "./booking-sheet-view";
import {
  BlockSheet,
  ClientSheet,
  ClosedSheet,
  NotificationsSheet,
  StripeSheet,
} from "./sheets-simple";
import { SheetFrame } from "./studio-sheet";
import type { StudioController } from "./use-studio";

/** The open sheet's body and footer inside the shared frame (prototype Studio.dc.html lines 1544–3418). */
export const StudioSheets = ({ studio }: { studio: StudioController }) => {
  const { sheet, bkStep } = studio.state;
  const bookingView = sheet === "booking" ? getBookingSheetView(studio) : null;
  return (
    <SheetFrame
      studio={studio}
      cover={
        bookingView && bkStep === "checkout" ? (
          <BookingCheckout studio={studio} view={bookingView} />
        ) : null
      }
      after={
        bookingView ? (
          <BookingSheetAfter studio={studio} view={bookingView} />
        ) : null
      }
    >
      {bookingView && <BookingSheetBody studio={studio} view={bookingView} />}
      {sheet === "notif" && <NotificationsSheet studio={studio} />}
      {sheet === "stripe" && <StripeSheet studio={studio} />}
      {sheet === "block" && <BlockSheet studio={studio} />}
      {sheet === "closed" && <ClosedSheet studio={studio} />}
      {sheet === "client" && <ClientSheet studio={studio} />}
    </SheetFrame>
  );
};

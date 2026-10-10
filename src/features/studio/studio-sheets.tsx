import { AddBookingSheet } from "./add-booking";
import { getAddBookingView } from "./add-booking-view";
import {
  BookingCheckout,
  BookingSheetAfter,
  BookingSheetBody,
} from "./booking-sheet";
import { getBookingSheetView } from "./booking-sheet-view";
import {
  AddonSheet,
  AddonSheetFooter,
  CategoriesSheet,
} from "./catalog-sheets";
import { getAddonSheetView, getCategoriesView } from "./catalog-sheets-view";
import {
  ClientEditFooter,
  ClientEditSheet,
  ClientViewSheet,
} from "./client-sheets";
import { getClientsView } from "./clients-view";
import {
  PastBadge,
  PastCheckout,
  PastSheetBody,
  PastSheetFooter,
} from "./past-sheet";
import { getPastSheetView } from "./past-sheet-view";
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
  const { sheet, bkStep, pastCk } = studio.state;
  const bookingView = sheet === "booking" ? getBookingSheetView(studio) : null;
  const pastView = sheet === "past" ? getPastSheetView(studio) : null;
  const addView = sheet === "add" ? getAddBookingView(studio) : null;
  const categoriesView = sheet === "cats" ? getCategoriesView(studio) : null;
  const addonView = sheet === "addon" ? getAddonSheetView(studio) : null;
  const clientsView =
    sheet === "cliView" || sheet === "clientEdit"
      ? getClientsView(studio)
      : null;
  return (
    <SheetFrame
      studio={studio}
      cover={
        bookingView && bkStep === "checkout" ? (
          <BookingCheckout studio={studio} view={bookingView} />
        ) : pastView && pastCk ? (
          <PastCheckout studio={studio} />
        ) : null
      }
      headerBadge={pastView && <PastBadge view={pastView} />}
      after={
        bookingView ? (
          <BookingSheetAfter studio={studio} view={bookingView} />
        ) : pastView ? (
          <PastSheetFooter view={pastView} />
        ) : clientsView && sheet === "clientEdit" ? (
          <ClientEditFooter view={clientsView} />
        ) : addonView ? (
          <AddonSheetFooter view={addonView} />
        ) : null
      }
    >
      {bookingView && <BookingSheetBody studio={studio} view={bookingView} />}
      {pastView && <PastSheetBody view={pastView} />}
      {clientsView?.isProfileSheet && <ClientViewSheet view={clientsView} />}
      {clientsView && sheet === "clientEdit" && (
        <ClientEditSheet view={clientsView} />
      )}
      {sheet === "notif" && <NotificationsSheet studio={studio} />}
      {addView && <AddBookingSheet studio={studio} view={addView} />}
      {categoriesView && (
        <CategoriesSheet studio={studio} view={categoriesView} />
      )}
      {addonView && <AddonSheet view={addonView} />}
      {sheet === "stripe" && <StripeSheet studio={studio} />}
      {sheet === "block" && <BlockSheet studio={studio} />}
      {sheet === "closed" && <ClosedSheet studio={studio} />}
      {sheet === "client" && <ClientSheet studio={studio} />}
    </SheetFrame>
  );
};

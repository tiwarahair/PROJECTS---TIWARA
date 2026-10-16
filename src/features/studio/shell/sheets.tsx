import { AddBookingSheet } from "../bookings/add";
import { getAddBookingView } from "../bookings/add/view";
import {
  BookingCheckout,
  BookingSheetAfter,
  BookingSheetBody,
} from "../bookings/sheet";
import { getBookingSheetView } from "../bookings/sheet/view";
import {
  AddonSheet,
  AddonSheetFooter,
  CategoriesSheet,
} from "../services/catalog-sheets";
import {
  getAddonSheetView,
  getCategoriesView,
} from "../services/catalog-sheets-view";
import {
  ClientEditFooter,
  ClientEditSheet,
  ClientViewSheet,
} from "../clients/sheets";
import { getClientsView } from "../clients/view";
import {
  PastBadge,
  PastCheckout,
  PastSheetBody,
  PastSheetFooter,
} from "../bookings/past";
import { getPastSheetView } from "../bookings/past/view";
import { BlockSheet } from "../settings/availability/block-sheet";
import { ClientSummarySheet } from "../clients/summary-sheet";
import { ClosedSheet } from "../settings/availability/closed-sheet";
import { NotificationsSheet } from "./notifications-sheet";
import { StripeSheet } from "../settings/payouts/stripe-sheet";
import { SheetFrame } from "./sheet-frame";
import type { StudioController } from "../core/use-studio";
import { WizardFooter, WizardSheet } from "../services/wizard";
import { getWizardView } from "../services/wizard/view";

/** The open sheet's body and footer inside the shared frame. */
export const StudioSheets = ({ studio }: { studio: StudioController }) => {
  const {
    sheet,
    bookingStep: bkStep,
    pastCheckoutPanel: pastCk,
  } = studio.state;

  const bookingView = sheet === "booking" ? getBookingSheetView(studio) : null;
  const pastView = sheet === "past" ? getPastSheetView(studio) : null;
  const addView = sheet === "add" ? getAddBookingView(studio) : null;
  const categoriesView = sheet === "cats" ? getCategoriesView(studio) : null;
  const addonView = sheet === "addon" ? getAddonSheetView(studio) : null;
  const wizardView = sheet === "svcwiz" ? getWizardView(studio) : null;

  const clientsView =
    sheet === "cliView" || sheet === "clientEdit"
      ? getClientsView(studio)
      : null;

  const getCover = () => {
    if (bookingView && bkStep === "checkout")
      return <BookingCheckout studio={studio} view={bookingView} />;

    return pastView && pastCk ? <PastCheckout studio={studio} /> : null;
  };

  const getAfter = () => {
    if (bookingView)
      return <BookingSheetAfter studio={studio} view={bookingView} />;

    if (pastView) return <PastSheetFooter view={pastView} />;

    if (clientsView && sheet === "clientEdit")
      return <ClientEditFooter view={clientsView} />;

    if (wizardView) return <WizardFooter view={wizardView} />;

    return addonView ? <AddonSheetFooter view={addonView} /> : null;
  };

  return (
    <SheetFrame
      studio={studio}
      cover={getCover()}
      headerBadge={pastView && <PastBadge view={pastView} />}
      after={getAfter()}
    >
      {bookingView && <BookingSheetBody studio={studio} view={bookingView} />}
      {pastView && <PastSheetBody view={pastView} />}
      {clientsView?.isProfileSheet && <ClientViewSheet view={clientsView} />}
      {clientsView && sheet === "clientEdit" && (
        <ClientEditSheet view={clientsView} />
      )}
      {sheet === "notif" && <NotificationsSheet studio={studio} />}
      {addView && <AddBookingSheet studio={studio} view={addView} />}
      {wizardView && <WizardSheet view={wizardView} />}
      {categoriesView && (
        <CategoriesSheet studio={studio} view={categoriesView} />
      )}
      {addonView && <AddonSheet view={addonView} />}
      {sheet === "stripe" && <StripeSheet studio={studio} />}
      {sheet === "block" && <BlockSheet studio={studio} />}
      {sheet === "closed" && <ClosedSheet studio={studio} />}
      {sheet === "client" && <ClientSummarySheet studio={studio} />}
    </SheetFrame>
  );
};

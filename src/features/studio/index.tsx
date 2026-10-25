import { useEffect } from "react";
import { AppShell } from "../../components/app-shell";
import { trackOpenStudio } from "../../stores/cache-listener";
import { useAppDispatch } from "../../stores/hooks";
import { FilterSheet, QuickActions, SlotPopover } from "./bookings/overlays";
import { StudioBookings, getBookingsView } from "./bookings";
import { StudioClients } from "./clients";
import { StudioReviews } from "./reviews";
import { StudioEarnings } from "./earnings";
import { StudioHome } from "./home";
import { StudioServices } from "./services";
import { StudioSettings } from "./settings";
import { EndDateDialog } from "./settings/availability/block-sheet";
import { StudioSheets } from "./shell/sheets";
import { TwoFactorDialog } from "./settings/two-factor";
import { BookingAddonDialog } from "./bookings/sheet/addon-dialog";
import { NewClientDialog } from "./bookings/dialogs";
import {
  WizardNewAddonDialog,
  WizardSuggestionDialogs,
} from "./services/wizard/dialogs";
import {
  ActionsMenu,
  ConfirmSheet,
  StudioToast,
  StudioTooltip,
} from "./shell/overlays";
import {
  Fab,
  FooterNav,
  LinkCard,
  SetupCard,
  SetupPill,
  StudioSidebar,
  StudioTopBar,
  getSetupProgress,
} from "./shell";
import { useStudio } from "./core/use-studio";
import type { StudioProps } from "./core/use-studio";

export type StudioPageProps = StudioProps;

/**
 * The stylist's Studio, route "/studio":
 * the Home / Bookings / Services / Earnings / Clients / Settings tabs, setup checklist, sheets and dialogs.
 */
export const StudioPage = (props: StudioPageProps) => {
  const studio = useStudio(props);
  const dispatch = useAppDispatch();

  const {
    state: {
      tab,
      setupMinimised,
      setupExit,
      filterOpen,
      linkCard,
      sheet,
      wizard,
    },
    isWide,
  } = studio;

  const { isComplete } = getSetupProgress(studio);

  const bookingsView = tab === "bookings" ? getBookingsView(studio) : null;

  // saves made here (or still landing after leaving) drop the cached Studio data once it closes
  useEffect(() => trackOpenStudio(dispatch), [dispatch]);

  return (
    <>
      <StudioTooltip studio={studio} />
      <AppShell
        label="Studio"
        isWide={isWide}
        sidebar={<StudioSidebar studio={studio} />}
        topBar={<StudioTopBar studio={studio} />}
        footerNav={<FooterNav studio={studio} />}
        bodyId="stbody"
        isBodyLocked={isWide && tab === "bookings"}
        overlays={
          <>
            {isWide && ((!isComplete && !setupMinimised) || !!setupExit) && (
              <SetupCard studio={studio} />
            )}
            {isWide && !isComplete && setupMinimised && !setupExit && (
              <SetupPill studio={studio} />
            )}
            {isWide && linkCard && <LinkCard studio={studio} />}
            {!isWide &&
              !sheet &&
              !wizard &&
              (tab === "home" || tab === "bookings" || tab === "services") && (
                <Fab studio={studio} />
              )}
            {sheet && <StudioSheets studio={studio} />}
            <SlotPopover studio={studio} />
            {bookingsView && (
              <QuickActions studio={studio} view={bookingsView} />
            )}
            <EndDateDialog studio={studio} />
            <WizardNewAddonDialog studio={studio} />
            <ActionsMenu studio={studio} />
            <WizardSuggestionDialogs studio={studio} />
            <TwoFactorDialog studio={studio} />
            <ConfirmSheet studio={studio} />
            <BookingAddonDialog studio={studio} />
            <NewClientDialog studio={studio} />
            <StudioToast studio={studio} />
          </>
        }
      >
        {tab === "home" && <StudioHome studio={studio} />}
        {tab === "services" && <StudioServices studio={studio} />}
        {tab === "earnings" && <StudioEarnings studio={studio} />}
        {tab === "clients" && <StudioClients studio={studio} />}
        {tab === "reviews" && <StudioReviews studio={studio} />}
        {tab === "settings" && <StudioSettings studio={studio} />}
        {bookingsView && (
          <>
            <StudioBookings studio={studio} view={bookingsView} />
            {filterOpen && <FilterSheet studio={studio} view={bookingsView} />}
          </>
        )}
      </AppShell>
    </>
  );
};

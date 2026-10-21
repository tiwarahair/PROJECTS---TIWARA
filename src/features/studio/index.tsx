import { useEffect, useLayoutEffect } from "react";
import { trackOpenStudio } from "../../stores/cache-listener";
import { useAppDispatch } from "../../stores/hooks";
import { joinClassNames } from "../../utils/class-names";
import { FilterSheet, QuickActions, SlotPopover } from "./bookings/overlays";
import { StudioBookings, getBookingsView } from "./bookings";
import { StudioClients } from "./clients";
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
import "../../styles/features/studio/global.module.css";
import styles from "../../styles/features/studio/shell/index.module.css";

export type StudioPageProps = StudioProps;

/**
 * The stylist's Studio, route "/studio": sidebar (wide) or footer nav (narrow), top bar,
 * the Home / Bookings / Services / Earnings / Clients / Settings tabs, setup checklist, sheets and dialogs.
 */
export const StudioPage = (props: StudioPageProps) => {
  const studio = useStudio(props);
  const dispatch = useAppDispatch();
  const { state, isWide } = studio;
  const { isComplete } = getSetupProgress(studio);

  const bookingsView =
    state.tab === "bookings" ? getBookingsView(studio) : null;

  useLayoutEffect(() => {
    document.documentElement.classList.add("studio-page");

    return () => document.documentElement.classList.remove("studio-page");
  }, []);

  // saves made here (or still landing after leaving) drop the cached Studio data once it closes
  useEffect(() => trackOpenStudio(dispatch), [dispatch]);

  return (
    <>
      <StudioTooltip studio={studio} />
      <div className={styles.studio} data-screen-label="Studio">
        <div
          className={joinClassNames(styles.frame, isWide && styles.frameWide)}
        >
          {isWide && <StudioSidebar studio={studio} />}
          <div
            className={joinClassNames(
              styles.mainCard,
              isWide && styles.mainCardWide,
            )}
            data-screen-label="Main card"
          >
            <StudioTopBar studio={studio} />
            <div
              className={joinClassNames(
                styles.body,
                isWide && state.tab === "bookings" && styles.bodyLocked,
              )}
              id="stbody"
            >
              {state.tab === "home" && <StudioHome studio={studio} />}
              {state.tab === "services" && <StudioServices studio={studio} />}
              {state.tab === "earnings" && <StudioEarnings studio={studio} />}
              {state.tab === "clients" && <StudioClients studio={studio} />}
              {state.tab === "settings" && <StudioSettings studio={studio} />}
              {bookingsView && (
                <>
                  <StudioBookings studio={studio} view={bookingsView} />
                  {state.filterOpen && (
                    <FilterSheet studio={studio} view={bookingsView} />
                  )}
                </>
              )}
            </div>
            {isWide &&
              ((!isComplete && !state.setupMinimised) || !!state.setupExit) && (
                <SetupCard studio={studio} />
              )}
            {isWide &&
              !isComplete &&
              state.setupMinimised &&
              !state.setupExit && <SetupPill studio={studio} />}
            {isWide && state.linkCard && <LinkCard studio={studio} />}
            {!isWide &&
              !state.sheet &&
              !state.wizard &&
              (state.tab === "home" ||
                state.tab === "bookings" ||
                state.tab === "services") && <Fab studio={studio} />}
            {!isWide && <FooterNav studio={studio} />}
            {state.sheet && <StudioSheets studio={studio} />}
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
          </div>
        </div>
      </div>
    </>
  );
};

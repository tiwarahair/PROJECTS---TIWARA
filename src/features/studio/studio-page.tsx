import { useEffect, useLayoutEffect } from "react";
import { onStudioWrite } from "../../lib/studio-writes";
import { api } from "../../stores/api-slice";
import { useAppDispatch } from "../../stores/hooks";
import { joinClassNames } from "../../utils/class-names";
import { FilterSheet, QuickActions, SlotPopover } from "./bookings-overlays";
import { StudioBookings, getBookingsView } from "./studio-bookings";
import { StudioClients } from "./studio-clients";
import { StudioEarnings } from "./studio-earnings";
import { StudioHome } from "./studio-home";
import { StudioServices } from "./studio-services";
import { StudioSettings } from "./studio-settings";
import { EndDateDialog } from "./sheets-simple";
import { StudioSheets } from "./studio-sheets";
import { TwoFactorDialog } from "./two-factor/two-factor-dialog";
import { BookingAddonDialog } from "./booking-sheet";
import { NewClientDialog } from "./booking-dialogs";
import {
  WizardNewAddonDialog,
  WizardSuggestionDialogs,
} from "./wizard-dialogs";
import {
  ActionsMenu,
  ConfirmSheet,
  StudioToast,
  StudioTooltip,
} from "./studio-overlays";
import {
  Fab,
  FooterNav,
  LinkCard,
  SetupCard,
  SetupPill,
  StudioSidebar,
  StudioTopBar,
  getSetupProgress,
} from "./studio-shell";
import { useStudio } from "./use-studio";
import type { StudioProps } from "./use-studio";
import "../../styles/features/studio/studio-page-global.module.css";
import styles from "../../styles/features/studio/studio-shell.module.css";

export type StudioPageProps = StudioProps;

/**
 * The stylist's Studio, route "/studio": sidebar (wide) or footer nav (narrow), top bar,
 * the Home / Bookings / Services / Earnings / Clients / Settings tabs, setup checklist, sheets and dialogs.
 */
export const StudioPage = (props: StudioPageProps) => {
  const studio = useStudio(props);
  const dispatch = useAppDispatch();
  const { state, isWide } = studio;
  const { isSetupOn, isComplete } = getSetupProgress(studio);

  const bookingsView =
    state.tab === "bookings" ? getBookingsView(studio) : null;

  useLayoutEffect(() => {
    document.documentElement.classList.add("studio-page");

    return () => document.documentElement.classList.remove("studio-page");
  }, []);

  // Studio's own data loaded before this visit's saves: drop it on the way out so the next visit loads afresh
  useEffect(() => {
    let hasSaved = false;
    const stopListening = onStudioWrite(() => (hasSaved = true));

    return () => {
      stopListening();

      if (hasSaved) dispatch(api.util.invalidateTags(["Studio", "TwoFactor"]));
    };
  }, [dispatch]);

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
              isSetupOn &&
              ((!isComplete && !state.setupMinimised) || !!state.setupExit) && (
                <SetupCard studio={studio} />
              )}
            {isWide &&
              isSetupOn &&
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

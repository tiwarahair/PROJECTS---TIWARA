import { useLayoutEffect } from "react";
import { joinClassNames } from "../../utils/class-names";
import { FilterSheet, QuickActions, SlotPopover } from "./bookings-overlays";
import { StudioBookings, getBookingsView } from "./studio-bookings";
import { StudioHome } from "./studio-home";
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
import "./studio-helmet.module.css";
import styles from "./studio-shell.module.css";

export type StudioPageProps = StudioProps;

/**
 * The stylist's Studio, route "/studio" (prototype Studio.dc.html): sidebar (wide) or footer nav (narrow), top bar,
 * the Home / Bookings / Services / Earnings / Clients / Settings tabs, setup checklist, sheets and dialogs.
 */
export const StudioPage = (props: StudioPageProps) => {
  const studio = useStudio(props);
  const { state, isWide } = studio;
  const { isSetupOn, isComplete } = getSetupProgress(studio);
  const bookingsView =
    state.tab === "bookings" ? getBookingsView(studio) : null;

  useLayoutEffect(() => {
    document.documentElement.classList.add("studio-page");
    return () => document.documentElement.classList.remove("studio-page");
  }, []);

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
              {bookingsView && (
                <>
                  <StudioBookings studio={studio} view={bookingsView} />
                  {state.filtOpen && (
                    <FilterSheet studio={studio} view={bookingsView} />
                  )}
                </>
              )}
            </div>
            {isWide &&
              isSetupOn &&
              ((!isComplete && !state.setupMin) || !!state.setupExit) && (
                <SetupCard studio={studio} />
              )}
            {isWide &&
              isSetupOn &&
              !isComplete &&
              state.setupMin &&
              !state.setupExit && <SetupPill studio={studio} />}
            {isWide && state.linkCard && <LinkCard studio={studio} />}
            {!isWide &&
              !state.sub &&
              !state.sheet &&
              !state.wiz &&
              (state.tab === "home" ||
                state.tab === "bookings" ||
                state.tab === "services") && <Fab studio={studio} />}
            {!isWide && <FooterNav studio={studio} />}
            <SlotPopover studio={studio} />
            {bookingsView && (
              <QuickActions studio={studio} view={bookingsView} />
            )}
            <ActionsMenu studio={studio} />
            <ConfirmSheet studio={studio} />
            <StudioToast studio={studio} />
          </div>
        </div>
      </div>
    </>
  );
};

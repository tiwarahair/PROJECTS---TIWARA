import type { ReactNode } from "react";
import { joinClassNames } from "../../utils/class-names";
import { getOverlayAnimation } from "./studio-overlay";
import type { BookingStep } from "./studio-types";
import type { StudioController } from "./use-studio";
import overlay from "../../styles/features/studio/studio-overlay.module.css";
import styles from "../../styles/features/studio/studio-sheet.module.css";

const BOOKING_TITLES: Record<BookingStep, string> = {
  view: "Booking",
  resched: "Reschedule",
  cancel: "Cancel booking",
  editsvc: "Edit service",
  changesvc: "Change service",
  addaddon: "Add an add-on",
  changeclient: "Change client",
  checkout: "Checkout",
  noshow: "No-show",
  payment: "Payment",
  done: "All done",
};

const SUB_STEPS: BookingStep[] = [
  "resched",
  "cancel",
  "editsvc",
  "changesvc",
  "addaddon",
  "changeclient",
  "payment",
];

/** The sheet's title, back button and body sizing. */
export const getSheetFrame = (studio: StudioController) => {
  const { state, setState, isWide, actions } = studio;
  const { sheet, bookingStep } = state;
  const isBooking = sheet === "booking";

  const isNarrowCheckout =
    !isWide && (bookingStep === "checkout" || bookingStep === "noshow");

  const getAddTitle = () => {
    if (state.addAddonPickerOpen) return "Add an add-on";

    return state.addEditService ? "Edit service" : "New booking";
  };

  const titles: Record<string, string> = {
    cats: "Manage categories",
    past: "Booking",
    notif: "Notifications",
    booking: BOOKING_TITLES[bookingStep] ?? "",
    add: getAddTitle(),
    svcwiz: state.wizard?.mode === "edit" ? "Edit service" : "Add a service",
    addon: state.addonDraft?.id ? "Edit add-on" : "New add-on",
    profile: "Edit profile",
    stripe: "Connect Stripe",
    block: "Block time",
    closed: "Closed period",
    client: "Client",
    clientEdit: state.clientEdit?.id ? "Edit client" : "Add client",
    cliView: "Client",
  };

  const isClientSheet = sheet === "client" || sheet === "cliView";

  const hasBack =
    (isBooking && (SUB_STEPS.includes(bookingStep) || isNarrowCheckout)) ||
    (isClientSheet &&
      (!!state.clientFromBookingId || !!state.clientFromPastId)) ||
    (sheet === "clientEdit" && !!state.clientEditFromView) ||
    (!!state.fromClientId &&
      (sheet === "past" || (isBooking && bookingStep === "view")));

  const goBack = () => {
    if (
      state.fromClientId &&
      (sheet === "past" || (isBooking && bookingStep === "view"))
    ) {
      actions.openSheet("cliView", {
        selectedClientId: state.fromClientId,
        fromClientId: null,
      });

      return;
    }

    if (isClientSheet && state.clientFromPastId) {
      actions.openSheet("past", { selectedPastId: state.clientFromPastId });

      return;
    }

    if (sheet === "clientEdit" && state.clientEditFromView) {
      actions.openSheet("cliView", {
        selectedClientId: state.clientEdit?.id ?? null,
      });

      return;
    }

    if (isClientSheet && state.clientFromBookingId) {
      actions.openSheet("booking", {
        sheetBookingId: state.clientFromBookingId,
        clientFromBookingId: null,
      });

      return;
    }

    const to: BookingStep =
      bookingStep === "changesvc" || bookingStep === "addaddon"
        ? "editsvc"
        : "view";

    setState({ bookingStepOut: true });

    window.setTimeout(
      () =>
        setState({
          bookingStepOut: false,
          bookingStepBack: to === "view",
          bookingStep: to,
        }),
      200,
    );

    if (to === "view")
      window.setTimeout(() => setState({ bookingStepBack: false }), 900);
  };

  const getTitle = () => {
    if (sheet === "add" && state.addRebook) return "Book again";

    return sheet ? titles[sheet] || "" : "";
  };

  return {
    title: getTitle(),
    hasBack,
    goBack,
    isBodyShort: isBooking && isNarrowCheckout,
    isFull: !isWide && sheet === "svcwiz",
    isTall:
      !isWide &&
      ((isBooking && bookingStep === "checkout") ||
        (sheet === "past" && !!state.pastCheckoutPanel)),
  };
};

export interface SheetFrameProps {
  studio: StudioController;
  /** Rendered over the sheet (the embedded checkout). */
  cover?: ReactNode;
  /** Shown in the header after the title (the past booking's status). */
  headerBadge?: ReactNode;
  children?: ReactNode;
  /** Below the scrolling body (panels and footers). */
  after?: ReactNode;
}

/** The scrim and side panel / bottom sheet every Studio sheet lives in. */
export const SheetFrame = ({
  studio,
  cover,
  headerBadge,
  children,
  after,
}: SheetFrameProps) => {
  const { state, isWide, actions } = studio;
  const frame = getSheetFrame(studio);

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        className={joinClassNames(
          styles.scrim,
          state.out ? overlay.scrimOut21 : overlay.scrimIn26,
        )}
        onClick={actions.closeSheet}
      ></div>
      <div
        className={joinClassNames(
          styles.panel,
          isWide
            ? styles.panelWide
            : joinClassNames(
                frame.isFull && styles.panelFull,
                frame.isTall && styles.panelTall,
              ),
          getOverlayAnimation(state.out, "side", isWide),
        )}
      >
        {cover}
        <div className={styles.head}>
          {frame.hasBack && (
            <button
              className={styles.back}
              onClick={frame.goBack}
              aria-label="Back"
            >
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 18-6-6 6-6"></path>
              </svg>
            </button>
          )}
          <div className={styles.titleRow}>
            {frame.title && <span className={styles.title}>{frame.title}</span>}
          </div>
          {state.sheet === "notif" && (
            <button
              className={styles.markAllRead}
              onClick={() => {
                studio.setState({ notifAllRead: true });
                actions.showToast("All caught up");
              }}
            >
              Mark all read
            </button>
          )}
          {headerBadge}
          <button
            className={styles.close}
            onClick={actions.closeSheet}
            aria-label="Close"
          >
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div
          className={joinClassNames(
            styles.body,
            frame.isBodyShort && styles.bodyShort,
          )}
        >
          {children}
        </div>
        {after}
      </div>
    </>
  );
};

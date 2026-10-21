// Studio's core actions: toasts, sheets, the action menu, pages, setup steps, the 2FA flow, booking status, blocked
// time, past bookings, rebooking and scrolling.
import { createStripeActions } from "../../settings/payouts/stripe-actions";
import { createTaxActions } from "../../settings/payouts/tax-actions";
import { createTwoFactorActions } from "../../settings/two-factor/actions";
import { createBlockActions } from "./blocks";
import { createBookingActions } from "./bookings";
import type { StudioContext } from "./context";
import { createFeedbackActions } from "./feedback";
import { createPageActions } from "./pages";
import { createScrollActions } from "./scroll";
import { createSheetActions } from "./sheets";

export type { StudioContext } from "./context";

export const createStudioActions = (context: StudioContext) => {
  const { showToast, isTouch, tipShow, tipHide, tipUpdate } =
    createFeedbackActions(context);

  const { scrollBody, scrollCalendarToNow, setCalendar, setDay, slideDay } =
    createScrollActions(context);

  const sheets = createSheetActions(context);
  const { openActionSheet, openSheet, closeSheet } = sheets;

  const { openPage, closePage, leavePage, checkDone } = createPageActions(
    context,
    { scrollBody },
  );

  const { setStatus, patchPast, rebookFrom, followToday, loadOlderPast } =
    createBookingActions(context, { showToast, openSheet, closeSheet });

  const { editBlock, removeBlock, blockActions, blockPop } = createBlockActions(
    context,
    { showToast, openSheet, openActionSheet },
  );

  const twoFactor = createTwoFactorActions(context, { showToast, checkDone });

  return {
    ...twoFactor,
    ...createTaxActions(context, { showToast, checkDone, twoFactor }),
    ...createStripeActions(context, {
      showToast,
      openTwoFactor: twoFactor.openTwoFactor,
    }),
    showToast,
    scrollBody,
    scrollCalendarToNow,
    setCalendar,
    setDay,
    slideDay,
    openActionSheet,
    closeActionSheet: sheets.closeActionSheet,
    openSheet,
    closeSheet,
    guardSheet: sheets.guardSheet,
    requestCloseSheet: sheets.requestCloseSheet,
    backToAdd: sheets.backToAdd,
    openPage,
    closePage,
    leavePage,
    checkDone,
    setStatus,
    editBlock,
    removeBlock,
    blockActions,
    blockPop,
    patchPast,
    rebookFrom,
    followToday,
    loadOlderPast,
    isTouch,
    tipShow,
    tipHide,
    tipUpdate,
    openSubpage: openPage,
  };
};

export type StudioActions = ReturnType<typeof createStudioActions>;

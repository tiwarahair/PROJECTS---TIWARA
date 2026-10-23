import { getDiscardConfirm, getSheetDraft, hasUnsavedSheet } from "../unsaved";
import type { ActionSheet, SheetKind, StudioState } from "../types";
import { clear } from "./context";
import type { StudioContext } from "./context";

const SHEET_RESET: Partial<StudioState> = {
  out: false,
  statusMenuOpen: false,
  pastCheckoutPanel: null,
  correctPayment: null,
  disputeForm: null,
  clientFromPastId: null,
  clientEditFromAdd: false,
  clientEditFromBooking: null,
  clientEditFocus: undefined,
  resumeChangeClient: null,
  bookingStep: "view",
  rescheduleDay: null,
  rescheduleTime: null,
  bookingEdit: false,
  bookingNoteOn: false,
  bookingAddressOn: false,
  cancelWho: "client",
  cancelFee: true,
  cancelReason: "",
  checkoutMethod: null,
  noShowCharge: "deposit",
};

const getAddDefaults = (): Partial<StudioState> => ({
  addEditService: false,
  addAddonPickerOpen: false,
  addAddons: [],
  addAddonOverrides: {},
  addExtra: 0,
  addonEdit: null,
  addRebook: false,
  addServiceQuery: "",
  addWalkIn: false,
  addProtection: "link",
  addUnpaidFee: null,
  addStep: 1,
  addClient: null,
  addService: null,
  addDay: null,
  addTime: null,
  addCustom: false,
  addClientQuery: "",
  addNew: null,
  addDuration: null,
  addPrice: null,
  addOverlapAllowed: false,
  addNote: "",
  addDeposit: "paid",
  addAddress: "",
});

export const getSheetDefaults = (
  type: SheetKind,
  { blockDraft }: Partial<StudioState>,
): Partial<StudioState> => {
  if (type === "booking" || type === "past") return { fromClientId: null };

  if (type === "add") return getAddDefaults();

  if (type !== "block" || !blockDraft) return {};

  const date = new Date();

  date.setDate(date.getDate() + (blockDraft.day || 0));

  return {
    blockCalendarMonth: date.getMonth(),
    blockCalendarYear: date.getFullYear(),
  };
};

export const createSheetActions = ({
  getState,
  setState,
  timers,
  memo,
}: StudioContext) => {
  const closeAfterExit = (
    key: string,
    exiting: Partial<StudioState>,
    closed: Partial<StudioState>,
  ) => {
    setState(exiting);
    clear(timers, key);
    timers[key] = window.setTimeout(() => setState(closed), 210);
  };

  const openActionSheet = (config: ActionSheet) =>
    setState({ actionSheet: config, actionSheetOut: false });

  const closeActionSheet = () => {
    if (!getState().actionSheet) return;

    closeAfterExit(
      "actionSheet",
      { actionSheetOut: true },
      { actionSheet: null, actionSheetOut: false },
    );
  };

  const openSheet = (type: SheetKind, extra: Partial<StudioState> = {}) => {
    setState({
      sheet: type,
      ...SHEET_RESET,
      ...getSheetDefaults(type, extra),
      ...extra,
    });

    memo.sheetDraft = getSheetDraft(getState());
  };

  const closeSheet = () => {
    if (!getState().sheet) return;

    closeAfterExit("sheet", { out: true }, { sheet: null, out: false });
  };

  // runs `proceed` straight away, or after "Discard" when the open sheet's draft has changed
  const guardSheet = (proceed: () => void) => {
    if (!hasUnsavedSheet(getState(), memo)) return proceed();

    setState({
      confirm: getDiscardConfirm(() => {
        setState({ confirm: null });
        proceed();
      }),
    });
  };

  const leaveClientEdit = (isSaved = false) => {
    const { clientEditFromBooking: from } = getState();

    if (from) {
      const { bookingId, clientId, fromClientId } = from;

      // cancelled or finished while the client was being edited
      if (!getState().bookings.some(({ id }) => id === bookingId)) {
        closeSheet();

        return;
      }

      openSheet("booking", {
        sheetBookingId: bookingId,
        fromClientId,
        bookingStep: "changeclient",
        resumeChangeClient: isSaved ? clientId : null,
      });

      return;
    }

    setState({
      sheet: "add",
      clientEdit: null,
      clientEditFromAdd: false,
      clientEditFocus: undefined,
    });
  };

  const isEditFromBooking = () => {
    const { sheet, clientEditFromAdd, clientEditFromBooking } = getState();

    return (
      sheet === "clientEdit" && (!!clientEditFromAdd || !!clientEditFromBooking)
    );
  };

  const requestCloseSheet = () =>
    guardSheet(isEditFromBooking() ? () => leaveClientEdit() : closeSheet);

  return {
    openActionSheet,
    closeActionSheet,
    openSheet,
    closeSheet,
    guardSheet,
    requestCloseSheet,
    leaveClientEdit,
    isEditFromBooking,
  };
};

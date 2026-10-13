// Studio's core actions: toasts, sheets, the action menu, pages, setup steps, the 2FA flow, booking status, blocked
// time, past bookings, rebooking and scrolling.
import { ICONS } from "./studio-data";
import { durationToMinutes, timeToMinutes } from "./studio-format";
import { getServiceDuration, getSteps, getWorkingHours } from "./studio-model";
import type { StudioSync } from "./studio-sync";
import {
  getDiscardConfirm,
  getSheetDraft,
  hasUnsavedSheet,
} from "./studio-unsaved";
import type { SavedSettings } from "./studio-unsaved";
import type {
  ActionSheet,
  BlockedTime,
  PastRecord,
  SheetKind,
  StudioPage,
  StudioPatch,
  StudioState,
} from "./studio-types";
import { removeBlock as removeBlockRow } from "../../lib/studio-api";
import { createTwoFactorActions } from "./studio-two-factor-actions";

export interface StudioContext {
  getState: () => StudioState;
  setState: (patch: StudioPatch) => void;
  /** setState without the "Discard changes?" check, for leaving a page after saving it. */
  applyState: (patch: StudioPatch) => void;
  /** Saves a real stylist's changes; null on demo boards. */
  sync: StudioSync | null;
  timers: Record<string, number>;
  /** Values kept between renders (seen setup steps, the clash override, the last pointer type). */
  memo: {
    saveSlug?: () => Promise<boolean>;
    seenDone?: ReturnType<typeof getSteps>;
    clashOk?: boolean;
    lastPointer?: string;
    tipListening?: boolean;
    swipe?: { x: number; y: number } | null;
    slideFrame?: number;
    applyEdit?: () => void;
    cancelBooking?: () => void;
    applyReschedule?: () => void;
    setChangeClient?: (id: string | null) => void;
    saveAddonEdit?: (draft: NonNullable<StudioState["addonEdit"]>) => void;
    removeAddonEdit?: (id: string) => void;
    statusItems?: {
      label: string;
      d: string;
      subtitle?: string;
      disabled?: boolean;
      danger?: boolean;
      run: () => void;
    }[];
    calendarKey?: string;
    weekScrollTarget?: number;
    weekScrolledKey?: string | null;
    locked?: boolean;
    weekKey?: number;
    saved?: SavedSettings;
    isSlugEdited?: boolean;
    isTaxEdited?: boolean;
    sheetDraft?: string;
    policyApi?: { canSave: boolean; isDirty: boolean; save: () => void };
    accountApi?: { canSave: boolean; save: () => void; discard: () => void };
    businessApi?: { canSave: boolean; save: () => void };
  };
  isWide: () => boolean;
}

const clear = (timers: Record<string, number>, key: string) =>
  window.clearTimeout(timers[key]);

/** The nearest scrolling ancestor, else the Studio body. */
const getScroller = (from?: Element | null): Element | null => {
  let element = from?.parentElement ?? null;

  while (element) {
    const overflowY = getComputedStyle(element).overflowY;

    if (
      (overflowY === "auto" || overflowY === "scroll") &&
      element.scrollHeight > element.clientHeight + 1
    )
      return element;

    element = element.parentElement;
  }

  return document.getElementById("stbody");
};

export const createStudioActions = (context: StudioContext) => {
  const { getState, setState, applyState, timers, memo, isWide } = context;

  const showToast = (message: string, undo?: () => void) => {
    clear(timers, "toast");
    setState({ toast: message, toastUndo: undo || null });

    timers.toast = window.setTimeout(
      () => setState({ toast: null, toastUndo: null }),
      undo ? 4200 : 2600,
    );
  };

  const scrollBody = (
    top: number,
    isSmooth: boolean,
    from?: Element | null,
  ) => {
    const body = getScroller(from) || document.getElementById("stbody");

    if (!body) {
      window.scrollTo(0, top);

      return;
    }

    try {
      body.scrollTo({ top, behavior: isSmooth ? "smooth" : "auto" });
    } catch {
      body.scrollTop = top;
    }
  };

  const scrollCalendarToNow = () => {
    clear(timers, "calendarScroll");

    timers.calendarScroll = window.setTimeout(
      () =>
        requestAnimationFrame(() => {
          const state = getState();

          if (state.tab !== "bookings" || state.bookingsLayout === "list")
            return;

          const hours = getWorkingHours(state, state.dayIndex || 0);

          const element =
            (state.dayIndex === 0 && document.getElementById("tl-now")) ||
            document.getElementById(
              `tl-h-${hours.on ? hours.start.slice(0, 2) : "09"}`,
            ) ||
            document.getElementById("tl-h-09");

          if (!element) return;

          const body = getScroller(element);

          if (!body) return;

          const rect = element.getBoundingClientRect();
          const bodyRect = body.getBoundingClientRect();
          const maxTop = Math.max(0, body.scrollHeight - body.clientHeight);
          const pad = Math.min(230, Math.max(40, body.clientHeight * 0.28));

          const top = Math.min(
            maxTop,
            Math.max(0, rect.top - bodyRect.top + body.scrollTop - pad),
          );

          scrollBody(top, true, element);
        }),
      140,
    );
  };

  const setCalendar = (patch: Partial<StudioState>) => {
    if (patch.bookingsLayout === "list") {
      setState(patch);
      clear(timers, "calendarScroll");
      requestAnimationFrame(() => scrollBody(0, false));

      return;
    }

    setState(patch);
    scrollCalendarToNow();
  };

  // pre-sets the calendar key so moving between days doesn't re-scroll to now
  const setDay = (patch: Partial<StudioState>) => {
    const state = getState();

    const dayIndex = patch.dayIndex != null ? patch.dayIndex : state.dayIndex;

    memo.calendarKey = `${state.tab}|${state.bookingsLayout}|${dayIndex}`;
    setState(patch);
  };

  const slideDay = (direction: number) => {
    setDay({ dayIndex: getState().dayIndex + direction, slideFrom: direction });
    cancelAnimationFrame(memo.slideFrame ?? 0);

    memo.slideFrame = requestAnimationFrame(() =>
      requestAnimationFrame(() => setState({ slideFrom: null })),
    );
  };

  const openActionSheet = (config: ActionSheet) =>
    setState({ actionSheet: config, actionSheetOut: false });

  const closeActionSheet = () => {
    if (!getState().actionSheet) return;

    setState({ actionSheetOut: true });
    clear(timers, "actionSheet");

    timers.actionSheet = window.setTimeout(
      () => setState({ actionSheet: null, actionSheetOut: false }),
      210,
    );
  };

  const openSheet = (type: SheetKind, extra: Partial<StudioState> = {}) => {
    let patch: Partial<StudioState> = extra;

    if ((type === "booking" || type === "past") && !("fromClientId" in patch))
      patch = { fromClientId: null, ...patch };

    if (type === "add")
      patch = {
        addEditService: false,
        addAddonPickerOpen: false,
        addAddons: [],
        addAddonOverrides: {},
        addExtra: 0,
        addonEdit: null,
        ...patch,
      };

    if (type === "block" && patch.blockDraft) {
      const date = new Date();

      date.setDate(date.getDate() + (patch.blockDraft.day || 0));

      patch = {
        blockCalendarMonth: date.getMonth(),
        blockCalendarYear: date.getFullYear(),
        ...patch,
      };
    }

    const base: Partial<StudioState> = {
      sheet: type,
      out: false,
      statusMenuOpen: false,
      pastCheckoutPanel: null,
      clientFromPastId: null,
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

    if (type === "add")
      Object.assign(base, {
        addRebook: false,
        addServiceQuery: "",
        addWalkIn: false,
        addProtection: "link",
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

    setState({ ...base, ...patch });
    memo.sheetDraft = getSheetDraft(getState());
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

  const requestCloseSheet = () => guardSheet(closeSheet);

  const closeSheet = () => {
    if (!getState().sheet) return;

    setState({ out: true });
    clear(timers, "sheet");

    timers.sheet = window.setTimeout(
      () => setState({ sheet: null, out: false }),
      210,
    );
  };

  const openPage = (name: StudioPage, fromSetup?: boolean) => {
    clear(timers, "sheet");

    setState(({ setupMinimised }) => ({
      tab: "settings",
      page: name,
      pageFromSetup: !!fromSetup,
      sheet: null,
      out: false,
      selectedClientId: null,
      setupMinimised: fromSetup ? true : setupMinimised,
    }));

    scrollBody(0, false);
  };

  const closePage = () => {
    setState({ page: null, pageFromSetup: false });
    scrollBody(0, false);
  };

  const leavePage = () => {
    const isHome = getState().pageFromSetup;

    const getLeavePatch = (): StudioPatch => {
      if (isHome)
        return {
          page: null,
          pageFromSetup: false,
          tab: "home",
          setupMinimised: false,
        };

      return isWide()
        ? { pageFromSetup: false }
        : { page: null, pageFromSetup: false };
    };

    applyState(getLeavePatch());
    scrollBody(0, false);
  };

  /** Ticks off finished setup steps and celebrates when all four are done. */
  const checkDone = () => {
    clear(timers, "checkDone");

    timers.checkDone = window.setTimeout(() => {
      const state = getState();
      const steps = getSteps(state);

      const seen = memo.seenDone ?? {
        availability: false,
        profile: false,
        secure: false,
        services: false,
      };

      const key = (
        ["availability", "profile", "secure", "services"] as const
      ).find((step) => steps[step] && !seen[step]);

      memo.seenDone = { ...steps };

      if (key) setState({ lastDone: key });

      if (
        steps.availability &&
        steps.profile &&
        steps.secure &&
        steps.services &&
        !state.celebrated
      ) {
        const wide = isWide();

        setState({
          celebrated: true,
          setupMinimised: false,
          setupExit: wide ? "hold" : null,
          linkCard: !wide,
        });

        if (wide) {
          clear(timers, "setupExit");

          timers.setupExit = window.setTimeout(() => {
            setState({ setupExit: "out" });

            timers.setupExit = window.setTimeout(
              () => setState({ setupExit: null, linkCard: true }),
              210,
            );
          }, 1200);
        }
      }
    }, 0);
  };

  const setStatus = (
    id: number,
    status: string,
    message: string,
    extra: Partial<StudioState["bookings"][0]> = {},
  ) => {
    const previous = getState().bookings;

    setState({
      bookings: previous.map((booking) =>
        booking.id === id ? { ...booking, status, ...extra } : booking,
      ),
    });

    showToast(message, () => setState({ bookings: previous }));
  };

  const editBlock = (block: BlockedTime) => {
    const isAllDay = block.span === "All day";
    const parts = isAllDay ? ["09:00", "18:00"] : block.span.split(" to ");

    const reason =
      block.note ??
      (block.reason || "")
        .replace(/( · )?Repeats (daily|weekly|monthly)( until [^·]*)?/, "")
        .trim();

    openSheet("block", {
      blockDraft: {
        day: block.dayIndex || 0,
        start: parts[0] ?? "",
        end: parts[1] || parts[0] || "",
        allDay: isAllDay,
        reason,
        frequency: block.frequency || "none",
        ends: block.ends || "never",
        endDayOffset: block.endDayOffset,
        color: block.color || "purple",
        editId: block.id,
      },
    });
  };

  const removeBlock = (block: BlockedTime) =>
    setState({
      confirm: {
        title: "Remove this blocked time?",
        body: `${block.day} · ${block.span} will open up for online booking again.`,
        yesLabel: "Remove",
        noLabel: "Keep it",
        yes: () => {
          const before = context.getState().blocked;

          setState(({ blocked }) => ({
            blocked: blocked.filter(({ id }) => id !== block.id),
            confirm: null,
          }));

          context.sync?.save(() => removeBlockRow(block.id), {
            blocked: before,
          });

          showToast("Blocked time removed");
        },
      },
    });

  const blockActions = (block: BlockedTime) =>
    openActionSheet({
      title: block.reason || "Blocked time",
      subtitle: `${block.day} · ${block.span}`,
      items: [
        { label: "Edit", iconPath: ICONS.edit, run: () => editBlock(block) },
        {
          label: "Delete",
          iconPath: ICONS.trash,
          danger: true,
          run: () => removeBlock(block),
        },
      ],
    });

  const blockPop = (
    block: BlockedTime,
    event: { clientX: number; clientY: number },
  ) => {
    if (!isWide()) return blockActions(block);

    const width = 236;
    const height = 150;
    const pad = 12;

    const x = Math.min(
      Math.max(pad, event.clientX - 20),
      window.innerWidth - width - pad,
    );

    const y = Math.min(event.clientY - 10, window.innerHeight - height - pad);

    setState({
      pop: {
        kind: "block",
        title: (block.reason || "Blocked time").replace(/( · )?Repeats.*$/, ""),
        subtitle: `${block.day} · ${block.span}`,
        x,
        y,
        block,
      },
    });
  };

  const patchPast = (
    pastId: string | number | undefined,
    patch: Partial<PastRecord> | ((row: PastRecord) => Partial<PastRecord>),
    seed: PastRecord[],
  ) => {
    const state = getState();

    const resolve = (row: PastRecord) =>
      typeof patch === "function" ? patch(row) : patch;

    if (state.pastNew.some((row) => row.pastId === pastId)) {
      setState({
        pastNew: state.pastNew.map((row) =>
          row.pastId === pastId ? { ...row, ...resolve(row) } : row,
        ),
      });

      return;
    }

    const current =
      seed.find((row) => row.pastId === pastId) ?? ({} as PastRecord);

    const overrides = state.pastOverrides ?? {};
    const key = String(pastId);
    const merged = { ...current, ...(overrides[key] ?? {}) };

    setState({
      pastOverrides: {
        ...overrides,
        [key]: { ...(overrides[key] ?? {}), ...resolve(merged) },
      },
    });
  };

  const rebookFrom = (booking: {
    service: string;
    client: string | null;
    price: number;
    stylistNote?: string;
    address?: string;
  }) => {
    const service = getState().services.find(
      ({ name }) => name === booking.service,
    );

    closeSheet();

    window.setTimeout(
      () =>
        openSheet("add", {
          addRebook: true,
          addStep: service ? 3 : 2,
          addClient: booking.client || null,
          addWalkIn: !booking.client,
          addService: service ? service.id : null,
          addPrice: booking.price,
          addNote: booking.stylistNote || "",
          addAddress: booking.address || "",
        }),
      230,
    );
  };

  /** Bookings that ended an hour ago are marked done-but-unpaid. */
  const autoComplete = () => {
    const state = getState();
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const done = state.bookings.filter(
      (booking) =>
        !booking.autoDone &&
        !booking.pending &&
        (booking.status === "arrived" || booking.status === "confirmed") &&
        (booking.dayOffset < 0 ||
          (booking.dayOffset === 0 &&
            timeToMinutes(booking.time) +
              durationToMinutes(
                booking.duration || getServiceDuration(state, booking.service),
              ) +
              60 <=
              nowMinutes)),
    );

    if (!done.length) return;

    setState({
      bookings: state.bookings.map((booking) =>
        done.includes(booking)
          ? { ...booking, autoDone: true, checkoutUnpaid: true }
          : booking,
      ),
    });
  };

  const isTouch = () =>
    memo.lastPointer === "touch" ||
    !!(window.matchMedia && window.matchMedia("(hover: none)").matches);

  const tipHide = () => {
    clear(timers, "tip");

    if (getState().tip) setState({ tip: null });
  };

  const tipShow = (
    event: { currentTarget: Element } | null | undefined,
    key: string,
    text: string,
    isBelow?: boolean,
  ) => {
    if (isTouch()) return;

    const element = event?.currentTarget;

    if (!element) return;

    clear(timers, "tip");

    if (!memo.tipListening) {
      memo.tipListening = true;

      document.addEventListener(
        "keydown",
        (keyEvent) => {
          if (keyEvent.key === "Escape" && getState().tip)
            setState({ tip: null });
        },
        true,
      );

      document.addEventListener(
        "pointerdown",
        (pointerEvent) => {
          memo.lastPointer = pointerEvent.pointerType;
        },
        true,
      );
    }

    const show = () => {
      const rect = element.getBoundingClientRect();

      const x = Math.min(
        Math.max(rect.left + rect.width / 2, 128),
        window.innerWidth - 128,
      );

      setState({
        tip: {
          key,
          text,
          x,
          y: isBelow ? rect.bottom : rect.top,
          below: !!isBelow,
        },
      });
    };

    if (getState().tip?.key === key) show();
    else timers.tip = window.setTimeout(show, 300);
  };

  const tipUpdate = (key: string, text: string) => {
    const tip = getState().tip;

    if (tip && tip.key === key) setState({ tip: { ...tip, text } });
  };

  return {
    ...createTwoFactorActions(context, { showToast, checkDone }),
    showToast,
    scrollBody,
    scrollCalendarToNow,
    setCalendar,
    setDay,
    slideDay,
    openActionSheet,
    closeActionSheet,
    openSheet,
    closeSheet,
    guardSheet,
    requestCloseSheet,
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
    autoComplete,
    isTouch,
    tipShow,
    tipHide,
    tipUpdate,
    openSubpage: openPage,
  };
};

export type StudioActions = ReturnType<typeof createStudioActions>;

// Studio's core actions (prototype Studio.dc.html: toastMsg, openSheet, closeSheet, openActs, openPage, leavePage,
// checkDone, the 2FA flow, setStatus, blocked time, patchPast, rebookFrom, scrolling).
import { ICONS } from "./studio-data";
import { durToMin, toMin } from "./studio-format";
import { getServiceDur, getSteps, getWorkingHours } from "./studio-model";
import type {
  ActionSheet,
  BlockedTime,
  PastRecord,
  SheetKind,
  StudioPage,
  StudioPatch,
  StudioState,
  TwoFactorFlow,
} from "./studio-types";

export interface StudioContext {
  getState: () => StudioState;
  setState: (patch: StudioPatch) => void;
  /** Named timeouts (the prototype's this._tt, this._st …). */
  timers: Record<string, number>;
  /** Instance fields the prototype keeps on `this` (seen setup steps, the clash override, the last pointer type). */
  memo: {
    seenDone?: ReturnType<typeof getSteps>;
    clashOk?: boolean;
    lastPointer?: string;
    tipListening?: boolean;
    welcome?: { at: number; first?: string; cats?: string[] } | null;
    swipe?: { x: number; y: number } | null;
    slideFrame?: number;
    applyFn?: () => void;
    cancelFn?: () => void;
    reschedFn?: () => void;
    ccSet?: (id: string | null) => void;
    aoSave?: (draft: NonNullable<StudioState["esAddon"]>) => void;
    aoRemove?: (id: string) => void;
    statusItems?: {
      label: string;
      d: string;
      sub?: string;
      off?: boolean;
      danger?: boolean;
      run: () => void;
    }[];
    calKey?: string;
    wkTarget?: number;
    wkScrolled?: string | null;
    locked?: boolean;
    wkKey?: number;
    polApi?: { canSave: boolean; save: () => void };
    accApi?: { canSave: boolean; save: () => void };
    bizApi?: { canSave: boolean; save: () => void };
  };
  isWide: () => boolean;
}

const clear = (timers: Record<string, number>, key: string) =>
  window.clearTimeout(timers[key]);

/** The nearest scrolling ancestor, else the Studio body (prototype scroller). */
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
  const { getState, setState, timers, memo, isWide } = context;

  const toastMsg = (message: string, undo?: () => void) => {
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

  const scrollCalToNow = () => {
    clear(timers, "calScroll");
    timers.calScroll = window.setTimeout(
      () =>
        requestAnimationFrame(() => {
          const state = getState();
          if (state.tab !== "bookings" || state.bview === "list") return;
          const hours = getWorkingHours(state, state.dayIdx || 0);
          const element =
            (state.dayIdx === 0 && document.getElementById("tl-now")) ||
            document.getElementById(
              "tl-h-" + (hours.on ? hours.s.slice(0, 2) : "09"),
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

  const setCal = (patch: Partial<StudioState>) => {
    if (patch.bview === "list") {
      setState(patch);
      clear(timers, "calScroll");
      requestAnimationFrame(() => scrollBody(0, false));
      return;
    }
    setState(patch);
    scrollCalToNow();
  };

  // pre-sets the calendar key so moving between days doesn't re-scroll to now
  const setDay = (patch: Partial<StudioState>) => {
    const state = getState();
    memo.calKey =
      state.tab +
      "|" +
      state.bview +
      "|" +
      (patch.dayIdx != null ? patch.dayIdx : state.dayIdx);
    setState(patch);
  };

  const slideDay = (direction: number) => {
    setDay({ dayIdx: getState().dayIdx + direction, slideFrom: direction });
    cancelAnimationFrame(memo.slideFrame ?? 0);
    memo.slideFrame = requestAnimationFrame(() =>
      requestAnimationFrame(() => setState({ slideFrom: null })),
    );
  };

  const openActs = (config: ActionSheet) =>
    setState({ acts: config, actsOut: false });

  const closeActs = () => {
    if (!getState().acts) return;
    setState({ actsOut: true });
    clear(timers, "acts");
    timers.acts = window.setTimeout(
      () => setState({ acts: null, actsOut: false }),
      210,
    );
  };

  const openSheet = (type: SheetKind, extra: Partial<StudioState> = {}) => {
    let patch: Partial<StudioState> = extra;
    if ((type === "booking" || type === "past") && !("fromCli" in patch))
      patch = { fromCli: null, ...patch };
    if (type === "add")
      patch = {
        addEditSvc: false,
        addAoPick: false,
        addAddons: [],
        addAoOv: {},
        addExtra: 0,
        esAddon: null,
        ...patch,
      };
    if (type === "block" && patch.blockDraft) {
      const date = new Date();
      date.setDate(date.getDate() + (patch.blockDraft.day || 0));
      patch = { blCalM: date.getMonth(), blCalY: date.getFullYear(), ...patch };
    }
    const base: Partial<StudioState> = {
      sheet: type,
      out: false,
      stMenu: false,
      pastCk: null,
      cFromP: null,
      bkStep: "view",
      rsDay: null,
      rsTime: null,
      bkEdit: false,
      bkNoteOn: false,
      bkLocOn: false,
      cxWho: "client",
      cxFee: true,
      cxReason: "",
      coMethod: null,
      nsCharge: "deposit",
    };
    if (type === "add")
      Object.assign(base, {
        addRebook: false,
        addSvcQ: "",
        addWalkIn: false,
        addProt: "link",
        addStep: 1,
        addClient: null,
        addSvc: null,
        addDay: null,
        addTime: null,
        addCustom: false,
        addQ: "",
        addNew: null,
        addDur: null,
        addPrice: null,
        addOverlapOk: false,
        addNote: "",
        addDep: "paid",
        addAddr: "",
      });
    setState({ ...base, ...patch });
  };

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
    clear(timers, "sub");
    clear(timers, "sheet");
    setState(({ setupMin }) => ({
      tab: "settings",
      page: name,
      pageFromSetup: !!fromSetup,
      sub: null,
      subOut: false,
      sheet: null,
      out: false,
      cliSel: null,
      setupMin: fromSetup ? true : setupMin,
    }));
    scrollBody(0, false);
  };

  const closePage = () => {
    setState({ page: null, pageFromSetup: false });
    scrollBody(0, false);
  };

  const leavePage = () => {
    const isHome = getState().pageFromSetup;
    setState(
      isHome
        ? { page: null, pageFromSetup: false, tab: "home", setupMin: false }
        : isWide()
          ? { pageFromSetup: false }
          : { page: null, pageFromSetup: false },
    );
    scrollBody(0, false);
  };

  const closeSub = () => {
    setState({ subOut: true });
    clear(timers, "sub");
    timers.sub = window.setTimeout(
      () => setState({ sub: null, subOut: false }),
      210,
    );
  };

  /** Ticks off finished setup steps and celebrates when all four are done. */
  const checkDone = () => {
    clear(timers, "checkDone");
    timers.checkDone = window.setTimeout(() => {
      const state = getState();
      const steps = getSteps(state);
      const seen = memo.seenDone ?? {
        avail: false,
        profile: false,
        secure: false,
        services: false,
      };
      const key = (["avail", "profile", "secure", "services"] as const).find(
        (step) => steps[step] && !seen[step],
      );
      memo.seenDone = { ...steps };
      if (key) setState({ lastDone: key });
      if (
        steps.avail &&
        steps.profile &&
        steps.secure &&
        steps.services &&
        !state.celebrated
      ) {
        const wide = isWide();
        setState({
          celebrated: true,
          setupMin: false,
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

  const openTf = (step: string, extra: Partial<TwoFactorFlow> = {}) => {
    clear(timers, "tf");
    setState({
      tf: {
        step,
        kind: "main",
        name: "Main phone",
        code: "",
        err: "",
        errMsg: "",
        keyOn: false,
        opt: "device",
        skipWarn: false,
        flow: "setup",
        ...extra,
      },
      tfOut: false,
    });
  };

  const closeTf = () => {
    if (!getState().tf) return;
    setState({ tfOut: true });
    clear(timers, "tf");
    timers.tf = window.setTimeout(
      () => setState({ tf: null, tfOut: false }),
      160,
    );
  };

  const setTf = (patch: Partial<TwoFactorFlow>) =>
    setState(({ tf }) => ({ tf: tf ? { ...tf, ...patch } : tf }));

  const WRONG_CODE =
    "That code isn’t right. Enter the latest code from your app.";

  const tfVerify = () => {
    const { tf, tfa } = getState();
    if (!tf) return;
    const devices = tfa.devices;
    const name = (tf.name || "").trim();
    if (!name) return setTf({ err: "name", errMsg: "Name this device" });
    if (
      devices.some((device) => device.name.toLowerCase() === name.toLowerCase())
    )
      return setTf({
        err: "name",
        errMsg: "You already have a device with this name",
      });
    if ((tf.code || "").length < 6)
      return setTf({ err: "code", errMsg: "Enter the 6-digit code" });
    if (tf.code !== "123456") return setTf({ err: "code", errMsg: WRONG_CODE });
    setState({
      tfa: {
        devices: devices.concat([{ name, backup: tf.kind === "backup" }]),
      },
    });
    if (tf.kind === "main")
      setTf({
        step: "backup",
        code: "",
        err: "",
        errMsg: "",
        opt: "device",
        skipWarn: false,
        keyOn: false,
      });
    else if (tf.flow === "add") {
      closeTf();
      toastMsg("Backup added");
    } else setTf({ step: "done", code: "", err: "", errMsg: "" });
    checkDone();
  };

  const tfRemove = () => {
    const { tf, tfa } = getState();
    if (!tf) return;
    const devices = tfa.devices;
    if (devices.length <= 1) {
      closeTf();
      return;
    }
    if ((tf.code || "").length < 6)
      return setTf({ err: "code", errMsg: "Enter the 6-digit code" });
    if (tf.code !== "123456") return setTf({ err: "code", errMsg: WRONG_CODE });
    let next = devices.filter((device) => device.name !== tf.name);
    if (!next.some(({ backup }) => !backup))
      next = next.map((device, index) =>
        index === 0 ? { ...device, backup: false } : device,
      );
    setState({ tfa: { devices: next } });
    closeTf();
    toastMsg(tf.name + " removed");
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
    toastMsg(message, () => setState({ bookings: previous }));
  };

  const editBlock = (block: BlockedTime) => {
    const isAllDay = block.span === "All day";
    const parts = isAllDay ? ["09:00", "18:00"] : block.span.split(" to ");
    const reason = (block.reason || "")
      .replace(/( · )?Repeats (daily|weekly|monthly)( until [^·]*)?/, "")
      .trim();
    openSheet("block", {
      blockDraft: {
        day: block.dayIdx || 0,
        start: parts[0] ?? "",
        end: parts[1] || parts[0] || "",
        allDay: isAllDay,
        reason,
        freq: block.freq || "none",
        ends: block.ends || "never",
        endOff: block.endOff,
        color: block.color || "purple",
        editId: block.id,
      },
    });
  };

  const removeBlock = (block: BlockedTime) =>
    setState({
      confirm: {
        title: "Remove this blocked time?",
        body:
          block.day +
          " · " +
          block.span +
          " will open up for online booking again.",
        yesLabel: "Remove",
        noLabel: "Keep it",
        yes: () => {
          setState(({ blocked }) => ({
            blocked: blocked.filter(({ id }) => id !== block.id),
            confirm: null,
          }));
          toastMsg("Blocked time removed");
        },
      },
    });

  const blockActions = (block: BlockedTime) =>
    openActs({
      title: block.reason || "Blocked time",
      sub: block.day + " · " + block.span,
      items: [
        { label: "Edit", d: ICONS.edit, run: () => editBlock(block) },
        {
          label: "Delete",
          d: ICONS.trash,
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
        sub: block.day + " · " + block.span,
        x,
        y,
        b: block,
      },
    });
  };

  const patchPast = (
    pid: string | number | undefined,
    patch: Partial<PastRecord> | ((row: PastRecord) => Partial<PastRecord>),
    seed: PastRecord[],
  ) => {
    const state = getState();
    const resolve = (row: PastRecord) =>
      typeof patch === "function" ? patch(row) : patch;
    if (state.pastNew.some((row) => row.pid === pid)) {
      setState({
        pastNew: state.pastNew.map((row) =>
          row.pid === pid ? { ...row, ...resolve(row) } : row,
        ),
      });
      return;
    }
    const current = seed.find((row) => row.pid === pid) ?? ({} as PastRecord);
    const overrides = state.pastOv ?? {};
    const key = String(pid);
    const merged = { ...current, ...(overrides[key] ?? {}) };
    setState({
      pastOv: {
        ...overrides,
        [key]: { ...(overrides[key] ?? {}), ...resolve(merged) },
      },
    });
  };

  const rebookFrom = (booking: {
    svc: string;
    client: string | null;
    price: number;
    stylistNote?: string;
    addr?: string;
  }) => {
    const service = getState().services.find(
      ({ name }) => name === booking.svc,
    );
    closeSheet();
    window.setTimeout(
      () =>
        openSheet("add", {
          addRebook: true,
          addStep: service ? 3 : 2,
          addClient: booking.client || null,
          addWalkIn: !booking.client,
          addSvc: service ? service.id : null,
          addPrice: booking.price,
          addNote: booking.stylistNote || "",
          addAddr: booking.addr || "",
        }),
      230,
    );
  };

  /** Bookings that ended an hour ago are marked done-but-unpaid (prototype autoComplete). */
  const autoComplete = () => {
    const state = getState();
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const done = state.bookings.filter(
      (booking) =>
        !booking.autoDone &&
        !booking.pending &&
        (booking.status === "arrived" || booking.status === "confirmed") &&
        (booking.off < 0 ||
          (booking.off === 0 &&
            toMin(booking.time) +
              durToMin(booking.dur || getServiceDur(state, booking.svc)) +
              60 <=
              nowMin)),
    );
    if (!done.length) return;
    setState({
      bookings: state.bookings.map((booking) =>
        done.includes(booking)
          ? { ...booking, autoDone: true, ckUnpaid: true }
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
    toastMsg,
    scrollBody,
    scrollCalToNow,
    setCal,
    setDay,
    slideDay,
    openActs,
    closeActs,
    openSheet,
    closeSheet,
    openPage,
    closePage,
    leavePage,
    closeSub,
    checkDone,
    openTf,
    closeTf,
    setTf,
    tfVerify,
    tfRemove,
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
    openSub: openPage,
  };
};

export type StudioActions = ReturnType<typeof createStudioActions>;

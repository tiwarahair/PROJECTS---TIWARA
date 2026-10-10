import { useEffect, useRef, useState } from "react";
import {
  buildLedger,
  getLedgerKey,
  getRange,
  toIsoDate,
} from "./earnings-data";
import type {
  EarningsClient,
  EarningsScenario,
  EarningsService,
  Ledger,
  PeriodId,
} from "./earnings-data";
import {
  downloadText,
  getEarningsCsv,
  getExportSlug,
  getStatementHtml,
  printHtml,
} from "./earnings-export";

const DAY_MS = 86400000;
const TOAST_MS = 2600;
const TOAST_OUT_MS = 180;
const DRAWER_OUT_MS = 200;
const EXPORT_OUT_MS = 180;
const DESK_MIN = 720;

export interface EarningsProps {
  scenario?: EarningsScenario;
  tab?: "tx" | "po";
  /** Opens a drawer or the export dialog on mount (boards). */
  open?: "none" | "tx" | "po" | "export";
  layout?: "auto" | "desktop" | "mobile";
  /** Full-height panel with its own scroll (standalone); otherwise it flows in the page. */
  contained?: boolean;
  showTitle?: boolean;
  period?: PeriodId;
  filt?: string;
  clients?: EarningsClient[];
  services?: EarningsService[];
  businessName?: string;
  legalName?: string;
  vatNumber?: string;
  bankLabel?: string;
  bookingLink?: string;
  taxHold?: boolean;
  onOpenBooking?: (bookingRef: string, clientId: string) => void;
  onContinueSetup?: () => void;
  onAddTax?: () => void;
  onLearnMore?: () => void;
}

export interface DrawerRef {
  k: "tx" | "po";
  id: string;
}

export interface EarningsState {
  period: PeriodId | null;
  cFrom: string;
  cTo: string;
  aFrom: string;
  aTo: string;
  ddOpen: boolean;
  ddCustom: boolean;
  cErr: string;
  tab: "tx" | "po" | null;
  filt: string | null;
  lim: number;
  bar: number | null;
  drawer: DrawerRef | null;
  drStack: DrawerRef[];
  drOut: boolean;
  exOn: boolean;
  exOut: boolean;
  exPeriod: PeriodId | null;
  exFrom: string;
  exTo: string;
  exFmt: "csv" | "pdf";
  toast: string;
  toastOut: boolean;
  width: number;
}

const INITIAL_STATE: EarningsState = {
  period: null,
  cFrom: "",
  cTo: "",
  aFrom: "",
  aTo: "",
  ddOpen: false,
  ddCustom: false,
  cErr: "",
  tab: null,
  filt: null,
  lim: 15,
  bar: null,
  drawer: null,
  drStack: [],
  drOut: false,
  exOn: false,
  exOut: false,
  exPeriod: null,
  exFrom: "",
  exTo: "",
  exFmt: "csv",
  toast: "",
  toastOut: false,
  width: 0,
};

/** Earnings state and actions (prototype class Component: state, componentDidMount, toastMsg, drawers, export). */
export const useEarnings = (props: EarningsProps) => {
  const { scenario = "default", layout = "auto" } = props;
  const [state, setRawState] = useState(INITIAL_STATE);
  const rootRef = useRef<HTMLDivElement>(null);
  const ledgerRef = useRef<{ key: string; ledger: Ledger } | null>(null);
  const timers = useRef({ toast: 0, toastOut: 0, drawer: 0, exportOut: 0 });
  const setState = (
    patch:
      | Partial<EarningsState>
      | ((current: EarningsState) => Partial<EarningsState>),
  ) =>
    setRawState((current) => ({
      ...current,
      ...(typeof patch === "function" ? patch(current) : patch),
    }));

  // rebuilt only when the scenario or the day changes (prototype build() cache)
  const getLedger = (): Ledger => {
    const key = getLedgerKey(scenario);
    if (ledgerRef.current?.key !== key)
      ledgerRef.current = {
        key,
        ledger: buildLedger(scenario, props.clients, props.services),
      };
    return ledgerRef.current.ledger;
  };
  const ledger = getLedger();

  const isDesk =
    layout === "desktop"
      ? true
      : layout === "mobile"
        ? false
        : state.width
          ? state.width >= DESK_MIN
          : true;
  const period = state.period || props.period || "week";
  const tab = state.tab || props.tab || "tx";
  const range =
    period === "custom"
      ? getRange("custom", state.aFrom, state.aTo)
      : getRange(period);

  const showToast = (message: string) => {
    window.clearTimeout(timers.current.toast);
    window.clearTimeout(timers.current.toastOut);
    setState({ toast: message, toastOut: false });
    timers.current.toast = window.setTimeout(() => {
      setState({ toastOut: true });
      timers.current.toastOut = window.setTimeout(
        () => setState({ toast: "" }),
        TOAST_OUT_MS,
      );
    }, TOAST_MS);
  };

  const openDrawer = (drawer: DrawerRef, isPush: boolean) => {
    window.clearTimeout(timers.current.drawer);
    setState((current) => ({
      drawer,
      drOut: false,
      drStack:
        isPush && current.drawer
          ? current.drStack.concat([current.drawer])
          : [],
    }));
  };
  const closeDrawer = () => {
    window.clearTimeout(timers.current.drawer);
    setState({ drOut: true });
    timers.current.drawer = window.setTimeout(
      () => setState({ drawer: null, drOut: false, drStack: [] }),
      DRAWER_OUT_MS,
    );
  };
  const closeExport = () => {
    window.clearTimeout(timers.current.exportOut);
    setState({ exOut: true });
    timers.current.exportOut = window.setTimeout(
      () => setState({ exOn: false, exOut: false }),
      EXPORT_OUT_MS,
    );
  };
  const openExport = () => {
    window.clearTimeout(timers.current.exportOut);
    setState({ exOn: true, exOut: false, exPeriod: period });
  };

  const doExport = () => {
    const exportPeriod = state.exPeriod || state.period || "week";
    const exportRange =
      exportPeriod === "custom"
        ? getRange(
            "custom",
            state.exFrom || state.aFrom,
            state.exTo || state.aTo,
          )
        : getRange(exportPeriod);
    const inRange = ledger.tx
      .filter(({ at }) => at >= exportRange.s && at < exportRange.e)
      .sort((first, second) => first.at.getTime() - second.at.getTime());
    const slug = getExportSlug(exportRange);
    if (state.exFmt === "csv")
      downloadText(
        "earnings-" + slug + ".csv",
        "text/csv;charset=utf-8",
        getEarningsCsv(inRange, props.clients),
      );
    else
      printHtml(
        getStatementHtml({
          range: exportRange,
          transactions: inRange,
          payouts: ledger.payouts
            .filter(({ sent }) => sent >= exportRange.s && sent < exportRange.e)
            .sort(
              (first, second) => first.sent.getTime() - second.sent.getTime(),
            ),
          clients: props.clients,
          businessName: props.businessName || "Tiwára’s House",
          legalName: props.legalName || "Amara Okonkwo",
          vatNumber: props.vatNumber || "",
          bankLabel: props.bankLabel,
        }),
      );
    closeExport();
    showToast("Your export is downloading.");
  };

  // width-driven layout, and the boards' open= drawer or export dialog
  useEffect(() => {
    const element = rootRef.current;
    let observer: ResizeObserver | undefined;
    if (element && window.ResizeObserver) {
      observer = new ResizeObserver(([entry]) => {
        const width = Math.round(entry?.contentRect.width ?? 0);
        setState((current) =>
          Math.abs(width - current.width) > 4 ? { width } : {},
        );
      });
      observer.observe(element);
    }
    const { open } = props;
    let openTimer = 0;
    if (open === "export") setState({ exOn: true });
    else if (open === "tx" || open === "po")
      openTimer = window.setTimeout(() => {
        const { tx, payouts } = getLedger();
        const id =
          open === "tx"
            ? (
                tx.find(
                  ({ po, desc, method }) =>
                    po && desc === "Balance" && method === "Saved card",
                ) ??
                tx.find(({ po }) => po) ??
                tx[0]
              )?.id
            : (
                payouts.find(
                  ({ status, items }) => status === "Paid" && items.length >= 3,
                ) ?? payouts[0]
              )?.id;
        if (id) setState({ drawer: { k: open, id } });
      }, 0);
    const pending = timers.current;
    return () => {
      observer?.disconnect();
      window.clearTimeout(openTimer);
      window.clearTimeout(pending.toast);
      window.clearTimeout(pending.toastOut);
      window.clearTimeout(pending.drawer);
      window.clearTimeout(pending.exportOut);
    };
    // mount only (prototype componentDidMount)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lastDay = (end: Date) => toIsoDate(new Date(end.getTime() - DAY_MS));

  return {
    rootRef,
    state,
    setState,
    ledger,
    isDesk,
    period,
    tab,
    range,
    showToast,
    openDrawer,
    closeDrawer,
    openExport,
    closeExport,
    doExport,
    lastDay,
  };
};

export type EarningsController = ReturnType<typeof useEarnings>;

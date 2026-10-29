import { useEffect, useRef, useState } from "react";
import { DAY_MS } from "./data";
import { getRange } from "./dates";
import type { EarningsClient, Ledger, PeriodId } from "./data";
import {
  downloadText,
  getEarningsCsv,
  getExportSlug,
  getStatementHtml,
  printHtml,
} from "./export";
import { toIsoDate } from "../../utils/dates";

const TOAST_MS = 2600;
const TOAST_OUT_MS = 180;
const DRAWER_OUT_MS = 200;
const EXPORT_OUT_MS = 180;
const DESKTOP_MIN = 720;

export interface EarningsProps {
  tab?: "tx" | "po";
  layout?: "auto" | "desktop" | "mobile";
  /** Full-height panel with its own scroll (standalone); otherwise it flows in the page. */
  contained?: boolean;
  showTitle?: boolean;
  period?: PeriodId;
  filter?: string;
  clients?: EarningsClient[];
  businessName?: string;
  legalName?: string;
  vatNumber?: string;
  bankLabel?: string;
  bookingLink?: string;
  taxHold?: boolean;
  ledger: Ledger;
  /** The newest payout's amount when it failed. */
  failedPayout?: number;
  /** a client's dispute waiting for the stylist's evidence. */
  dispute?: { text: string; onRespond: () => void };
  onUpdateBank?: () => void;
  onOpenBooking?: (bookingRef: string, clientId: string) => void;
  onContinueSetup?: () => void;
  onAddTax?: () => void;
  onLearnMore?: () => void;
}

interface DrawerRef {
  kind: "tx" | "po";
  id: string;
}

interface EarningsState {
  period: PeriodId | null;
  customFrom: string;
  customTo: string;
  appliedFrom: string;
  appliedTo: string;
  dropdownOpen: boolean;
  dropdownCustom: boolean;
  customError: string;
  tab: "tx" | "po" | null;
  filter: string | null;
  limit: number;
  bar: number | null;
  drawer: DrawerRef | null;
  drawerStack: DrawerRef[];
  drawerOut: boolean;
  exportOn: boolean;
  exportOut: boolean;
  exportPeriod: PeriodId | null;
  exportFrom: string;
  exportTo: string;
  exportFormat: "csv" | "pdf";
  toast: string;
  toastOut: boolean;
  width: number;
}

const INITIAL_STATE: EarningsState = {
  period: null,
  customFrom: "",
  customTo: "",
  appliedFrom: "",
  appliedTo: "",
  dropdownOpen: false,
  dropdownCustom: false,
  customError: "",
  tab: null,
  filter: null,
  limit: 15,
  bar: null,
  drawer: null,
  drawerStack: [],
  drawerOut: false,
  exportOn: false,
  exportOut: false,
  exportPeriod: null,
  exportFrom: "",
  exportTo: "",
  exportFormat: "csv",
  toast: "",
  toastOut: false,
  width: 0,
};

export const useEarnings = (props: EarningsProps) => {
  const { ledger, layout = "auto", businessName = "" } = props;
  const [state, setRawState] = useState(INITIAL_STATE);
  const rootRef = useRef<HTMLDivElement>(null);
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

  const getIsDesktop = () => {
    if (layout === "desktop") return true;

    if (layout === "mobile") return false;

    return state.width ? state.width >= DESKTOP_MIN : true;
  };

  const isDesktop = getIsDesktop();
  const period = state.period || props.period || "week";
  const tab = state.tab || props.tab || "tx";

  const range =
    period === "custom"
      ? getRange("custom", state.appliedFrom, state.appliedTo)
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
      drawerOut: false,
      drawerStack:
        isPush && current.drawer
          ? current.drawerStack.concat([current.drawer])
          : [],
    }));
  };

  const closeDrawer = () => {
    window.clearTimeout(timers.current.drawer);
    setState({ drawerOut: true });

    timers.current.drawer = window.setTimeout(
      () => setState({ drawer: null, drawerOut: false, drawerStack: [] }),
      DRAWER_OUT_MS,
    );
  };

  const closeExport = () => {
    window.clearTimeout(timers.current.exportOut);
    setState({ exportOut: true });

    timers.current.exportOut = window.setTimeout(
      () => setState({ exportOn: false, exportOut: false }),
      EXPORT_OUT_MS,
    );
  };

  const openExport = () => {
    window.clearTimeout(timers.current.exportOut);
    setState({ exportOn: true, exportOut: false, exportPeriod: period });
  };

  const doExport = () => {
    if (!businessName) return;

    const exportPeriod = state.exportPeriod || state.period || "week";

    const exportRange =
      exportPeriod === "custom"
        ? getRange(
            "custom",
            state.exportFrom || state.appliedFrom,
            state.exportTo || state.appliedTo,
          )
        : getRange(exportPeriod);

    const inRange = ledger.transactions
      .filter(({ at }) => at >= exportRange.start && at < exportRange.end)
      .sort((first, second) => first.at.getTime() - second.at.getTime());

    const slug = getExportSlug(exportRange);

    if (state.exportFormat === "csv")
      downloadText(
        `earnings-${slug}.csv`,
        "text/csv;charset=utf-8",
        getEarningsCsv(inRange, props.clients),
      );
    else
      printHtml(
        getStatementHtml({
          range: exportRange,
          transactions: inRange,
          payouts: ledger.payouts
            .filter(
              ({ sent }) => sent >= exportRange.start && sent < exportRange.end,
            )
            .sort(
              (first, second) => first.sent.getTime() - second.sent.getTime(),
            ),
          clients: props.clients,
          businessName,
          legalName: props.legalName ?? "",
          vatNumber: props.vatNumber || "",
          bankLabel: props.bankLabel,
        }),
      );

    closeExport();
    showToast("Your export is downloading.");
  };

  // width-driven layout
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

    const pending = timers.current;

    return () => {
      observer?.disconnect();
      window.clearTimeout(pending.toast);
      window.clearTimeout(pending.toastOut);
      window.clearTimeout(pending.drawer);
      window.clearTimeout(pending.exportOut);
    };
    // mount only
  }, []);

  const lastDay = (end: Date) => toIsoDate(new Date(end.getTime() - DAY_MS));

  return {
    rootRef,
    state,
    setState,
    ledger,
    isDesktop,
    period,
    tab,
    range,
    showToast,
    openDrawer,
    closeDrawer,
    canExport: !!businessName,
    openExport,
    closeExport,
    doExport,
    lastDay,
  };
};

export type EarningsController = ReturnType<typeof useEarnings>;

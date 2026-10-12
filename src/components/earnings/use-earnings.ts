import { useEffect, useRef, useState } from "react";
import { buildLedger, getLedgerKey, getRange } from "./earnings-data";
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
import { toIsoDate } from "../../utils/dates";

const DAY_MS = 86400000;
const TOAST_MS = 2600;
const TOAST_OUT_MS = 180;
const DRAWER_OUT_MS = 200;
const EXPORT_OUT_MS = 180;
const DESKTOP_MIN = 720;

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
  filter?: string;
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

/** Earnings state and actions. */
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

  // rebuilt only when the scenario or the day changes
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

    if (open === "export") setState({ exportOn: true });
    else if (open === "tx" || open === "po")
      openTimer = window.setTimeout(() => {
        const { transactions, payouts } = getLedger();

        const id =
          open === "tx"
            ? (
                transactions.find(
                  ({ payoutId, description, method }) =>
                    payoutId &&
                    description === "Balance" &&
                    method === "Saved card",
                ) ??
                transactions.find(({ payoutId }) => payoutId) ??
                transactions[0]
              )?.id
            : (
                payouts.find(
                  ({ status, items }) => status === "Paid" && items.length >= 3,
                ) ?? payouts[0]
              )?.id;

        if (id) setState({ drawer: { kind: open, id } });
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
    // mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    openExport,
    closeExport,
    doExport,
    lastDay,
  };
};

export type EarningsController = ReturnType<typeof useEarnings>;

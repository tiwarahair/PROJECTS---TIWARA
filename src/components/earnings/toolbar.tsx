import { ArrowDownToLine } from "lucide-react";
import { getRangeLabel } from "./dates";
import { PeriodPicker } from "./period-picker";
import type { EarningsController } from "./use-earnings";
import styles from "../../styles/components/earnings/toolbar.module.css";

interface ToolbarProps {
  earnings: EarningsController;
}

export const Toolbar = ({ earnings }: ToolbarProps) => (
  <div className={styles.toolbar}>
    <PeriodPicker earnings={earnings} />
    <div className={styles.rangeLabel}>{getRangeLabel(earnings.range)}</div>
    <span className={styles.spacer}></span>
    <button
      className={styles.export}
      disabled={!earnings.canExport}
      onClick={earnings.openExport}
    >
      <ArrowDownToLine size={16} strokeWidth={1.7} />
      Export
    </button>
  </div>
);

import type { CSSProperties } from "react";
import { joinClassNames } from "../../utils/class-names";
import { getBuckets, getRangeLabel } from "./dates";
import { getTakings } from "./logic";
import type { EarningsController } from "./use-earnings";
import styles from "../../styles/components/earnings/chart.module.css";
import { formatMoney } from "../../utils/money";

const getBarFillClass = (
  isFuture: boolean,
  isSelected: boolean,
  hasSelection: boolean,
) => {
  if (isFuture) return styles.barFuture;

  if (isSelected) return styles.barSelected;

  return hasSelection ? styles.barDimmed : styles.barIdle;
};

interface ChartProps {
  earnings: EarningsController;
}

export const Chart = ({
  earnings: { ledger, range, state, setState },
}: ChartProps) => {
  const buckets = getBuckets(range);
  const now = new Date();

  const bars = buckets.buckets.map((bucket) => ({
    ...bucket,
    value: getTakings(ledger.transactions, bucket.start, bucket.end),
    isFuture: bucket.start > now,
  }));

  const maxValue = Math.max(1, ...bars.map(({ value }) => value));
  const selectedBar = state.bar != null ? bars[state.bar] : undefined;

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHead}>
        <div className={styles.strongText}>{buckets.title}</div>
        <div className={styles.chartSub}>
          {selectedBar ? selectedBar.long : getRangeLabel(range)}
        </div>
      </div>
      <div
        className={joinClassNames(
          styles.bars,
          bars.length > 10 ? styles.barsDense : styles.barsWide,
        )}
      >
        {bars.map(({ label, long, value, isFuture }, index) => {
          const isSelected = state.bar === index;

          // the bar height is the takings scaled to the busiest bucket; the delay staggers the entrance
          const barStyle = {
            "--bar-h": `${Math.max(4, Math.round((value / maxValue) * 84))}px`,
            "--bar-delay": `${(index * 0.03).toFixed(2)}s`,
          } as CSSProperties;

          return (
            <button
              key={`b${index}`}
              className={styles.bar}
              onClick={() => setState({ bar: isSelected ? null : index })}
              aria-label={`${long}, ${formatMoney(value, { pence: "always" })}`}
            >
              <span
                className={joinClassNames(
                  styles.barAmount,
                  isSelected ? styles.barAmountShown : styles.barAmountHidden,
                )}
              >
                {`£${Math.round(value)}`}
              </span>
              <span
                className={joinClassNames(
                  styles.barFill,
                  getBarFillClass(isFuture, isSelected, state.bar != null),
                )}
                style={barStyle}
              ></span>
              <span
                className={joinClassNames(
                  styles.barLabel,
                  isSelected ? styles.barLabelSelected : styles.barLabelIdle,
                )}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

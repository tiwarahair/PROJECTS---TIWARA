import { joinClassNames } from "../../utils/class-names";
import { Balance } from "./balance";
import { Chart } from "./chart";
import { EarningsLists } from "./lists";
import { EarningsOverlays } from "./overlays";
import { Tabs } from "./tabs";
import { Tiles } from "./tiles";
import { Toolbar } from "./toolbar";
import { useEarnings } from "./use-earnings";
import type { EarningsProps } from "./use-earnings";
import styles from "../../styles/components/earnings/index.module.css";

export type { EarningsProps } from "./use-earnings";

/**
 * Studio → Earnings: balance, period picker, totals, takings chart, transactions and
 * payouts with detail drawers, and the CSV / PDF export.
 */
export const Earnings = (props: EarningsProps) => {
  const earnings = useEarnings(props);
  const { rootRef, state, isDesktop } = earnings;
  const contained = !!props.contained;
  const filter = state.filter || props.filter || "all";

  return (
    <div
      className={joinClassNames(
        styles.root,
        contained ? styles.rootContained : styles.rootInline,
      )}
      ref={rootRef}
      data-screen-label="Earnings"
    >
      <div
        className={joinClassNames(
          styles.scroll,
          contained ? styles.scrollContained : styles.scrollInline,
          contained && (isDesktop ? styles.padDesk : styles.padMobile),
        )}
      >
        <Balance earnings={earnings} props={props} />
        <Toolbar earnings={earnings} />
        <Tiles earnings={earnings} />
        <Chart earnings={earnings} />
        <Tabs earnings={earnings} filter={filter} />
        <EarningsLists earnings={earnings} props={props} filter={filter} />

        <div className={styles.footnote}>
          {
            "You keep every penny of your price. Clients pay the booking fee.\u00a0"
          }
        </div>
      </div>

      <EarningsOverlays earnings={earnings} props={props} />
    </div>
  );
};

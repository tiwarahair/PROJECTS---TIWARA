import { joinClassNames } from "../../utils/class-names";
import type { EarningsController } from "./use-earnings";
import styles from "../../styles/components/earnings/tabs.module.css";

const TABS = [
  ["tx", "Transactions"],
  ["po", "Payouts"],
] as const;

const FILTERS = [
  ["all", "All"],
  ["card", "Card"],
  ["recorded", "Recorded"],
  ["fees", "Fees & refunds"],
] as const;

interface TabsProps {
  earnings: EarningsController;
  filter: string;
}

export const Tabs = ({ earnings: { tab, setState }, filter }: TabsProps) => (
  <div className={styles.tabRow}>
    <div className={styles.tabs} role="tablist">
      {TABS.map(([id, label]) => {
        const isOn = tab === id;

        return (
          <button
            key={id}
            className={joinClassNames(
              styles.tab,
              isOn ? styles.tabOn : styles.tabOff,
            )}
            role="tab"
            aria-selected={isOn}
            onClick={() => setState({ tab: id })}
          >
            {label}
          </button>
        );
      })}
    </div>
    {tab === "tx" && (
      <div className={styles.chips}>
        {FILTERS.map(([id, label]) => (
          <button
            key={id}
            className={joinClassNames(
              styles.chip,
              filter === id ? styles.chipOn : styles.chipOff,
            )}
            onClick={() => setState({ filter: id, limit: 15 })}
          >
            {label}
          </button>
        ))}
      </div>
    )}
  </div>
);

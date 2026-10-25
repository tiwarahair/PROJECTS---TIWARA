import type { ReactNode } from "react";
import Skeleton from "react-loading-skeleton";
import { joinClassNames } from "../../utils/class-names";
import styles from "../../styles/components/stat-cards/index.module.css";

export interface StatCard {
  label: string;
  value: ReactNode;
  sub?: string;
  isEmpty?: boolean;
  isLoading?: boolean;
  isAlert?: boolean;
}

interface StatCardsProps {
  cards: StatCard[];
  isWide: boolean;
}

export const StatCards = ({ cards, isWide }: StatCardsProps) => (
  <div className={joinClassNames(styles.stats, isWide && styles.wide)}>
    {cards.map(({ label, value, sub, isEmpty, isLoading, isAlert }) => (
      <div key={label} className={styles.stat}>
        <span className={styles.statLabel}>{label}</span>
        {isLoading && <Skeleton width={36} height={26} />}
        {!isLoading && isEmpty && <span className={styles.statEmpty}>—</span>}
        {!isLoading && !isEmpty && (
          <span
            className={joinClassNames(
              styles.statValue,
              isAlert && styles.alert,
            )}
          >
            {value}
          </span>
        )}
        {!!sub && <span className={styles.statSub}>{sub}</span>}
      </div>
    ))}
  </div>
);

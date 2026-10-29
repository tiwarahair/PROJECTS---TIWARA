import type { ReactNode } from "react";
import Skeleton from "react-loading-skeleton";
import { joinClassNames } from "../../utils/class-names";
import { InlineRetry } from "../inline-retry";
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
  /** The numbers' query failed: dashes and a Try again line instead of skeletons. */
  onRetry?: () => void;
}

export const StatCards = ({ cards, isWide, onRetry }: StatCardsProps) => (
  <>
    <div className={joinClassNames(styles.stats, isWide && styles.wide)}>
      {cards.map(({ label, value, sub, isEmpty, isLoading, isAlert }) => {
        const isMissing = !!onRetry || isEmpty;
        const isWaiting = !onRetry && isLoading;

        return (
          <div key={label} className={styles.stat}>
            <span className={styles.statLabel}>{label}</span>
            {isWaiting && <Skeleton width={36} height={26} />}
            {!isWaiting && isMissing && (
              <span className={styles.statEmpty}>—</span>
            )}
            {!isWaiting && !isMissing && (
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
        );
      })}
    </div>
    {onRetry && (
      <InlineRetry
        className={styles.retry}
        text="These numbers didn’t load."
        onRetry={onRetry}
      />
    )}
  </>
);

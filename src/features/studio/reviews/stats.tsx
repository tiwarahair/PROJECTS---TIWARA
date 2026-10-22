import { Star } from "lucide-react";
import type { getReviewStats } from "./view";
import styles from "../../../styles/features/studio/reviews/index.module.css";

interface ReviewStatsProps {
  stats: ReturnType<typeof getReviewStats>;
  /** phones get one short line under each number */
  isShort: boolean;
}

/** Average rating, how many reviews, and how many have a reply. */
export const ReviewStats = ({
  stats: { rating, counted, total, checking, replied },
  isShort,
}: ReviewStatsProps) => {
  const getAverageNote = () => {
    if (rating == null)
      return isShort ? "Shows from 3" : "Shows from 3 reviews";

    return isShort
      ? `From ${counted} reviews`
      : `From ${counted} reviews in your rating`;
  };

  const getCheckingNote = () => {
    if (checking) return `${checking} being checked`;

    return isShort ? "All counted" : "All count toward your rating";
  };

  return (
    <div className={styles.stats}>
      <div className={styles.stat}>
        <span className={styles.statLabel}>Average rating</span>
        {rating == null ? (
          <span className={styles.statEmpty}>—</span>
        ) : (
          <span className={styles.statValue}>
            <Star size={22} strokeWidth={0} fill="var(--brand-yellow)" />
            {rating.toFixed(1)}
          </span>
        )}
        <span className={styles.statSub}>{getAverageNote()}</span>
      </div>
      <div className={styles.stat}>
        <span className={styles.statLabel}>Reviews</span>
        <span className={styles.statValue}>{total}</span>
        <span className={styles.statSub}>{getCheckingNote()}</span>
      </div>
      <div className={styles.stat}>
        <span className={styles.statLabel}>Replied to</span>
        <span className={styles.statValue}>{replied}</span>
        <span className={styles.statSub}>
          {isShort ? "Shown publicly" : "Replies show on your profile"}
        </span>
      </div>
    </div>
  );
};

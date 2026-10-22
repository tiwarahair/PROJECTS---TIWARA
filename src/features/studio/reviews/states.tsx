import { Star } from "lucide-react";
import Skeleton from "react-loading-skeleton";
import styles from "../../../styles/features/studio/reviews/index.module.css";

const ROWS = [1, 2, 3];

/** The stats and 3 review rows while they load. */
export const ReviewsSkeleton = () => (
  <div aria-hidden="true" className={styles.skeleton}>
    <div className={styles.stats}>
      {ROWS.map((row) => (
        <Skeleton key={row} height={104} borderRadius={24} />
      ))}
    </div>
    <Skeleton height={42} borderRadius={999} />
    <div className={styles.panel}>
      {ROWS.map((row) => (
        <div key={row} className={styles.skeletonRow}>
          <Skeleton circle width={40} height={40} />
          <div className={styles.skeletonText}>
            <Skeleton width="38%" height={14} />
            <Skeleton width="26%" height={12} />
            <Skeleton count={2} height={12} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

interface EmptyBoxProps {
  title: string;
  body: string;
  action: string;
  onAction: () => void;
  hasIcon?: boolean;
}

/** The Clients-style dashed box: no reviews yet, or nothing matches. */
export const EmptyBox = ({
  title,
  body,
  action,
  onAction,
  hasIcon = false,
}: EmptyBoxProps) => (
  <div className={styles.empty}>
    {hasIcon && (
      <Star size={28} strokeWidth={1.6} className={styles.emptyIcon} />
    )}
    <div className={styles.emptyTitle}>{title}</div>
    <div className={styles.emptyBody}>{body}</div>
    <button type="button" className={styles.emptyAction} onClick={onAction}>
      {action}
    </button>
  </div>
);

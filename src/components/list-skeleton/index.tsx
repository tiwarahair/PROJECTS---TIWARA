import Skeleton from "react-loading-skeleton";
import { joinClassNames } from "../../utils/class-names";
import stats from "../../styles/components/stat-cards/index.module.css";
import styles from "../../styles/components/list-panel/index.module.css";

const ROWS = [1, 2, 3];

interface ListSkeletonProps {
  isWide: boolean;
}

/** Three stat cards, the controls and three rows while a list loads. */
export const ListSkeleton = ({ isWide }: ListSkeletonProps) => (
  <div aria-hidden="true" className={styles.skeleton}>
    <div className={joinClassNames(stats.stats, isWide && stats.wide)}>
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

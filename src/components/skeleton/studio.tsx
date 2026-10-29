import Skeleton from "react-loading-skeleton";
import styles from "../../styles/components/skeleton/studio.module.css";

/** Studio while the stylist's business loads: sidebar (desktop), greeting and a few cards. */
export const StudioSkeleton = () => (
  <div aria-hidden="true" data-testid="studio-skeleton" className={styles.page}>
    <div className={styles.sidebar}>
      <Skeleton count={6} height={36} className={styles.navItem} />
    </div>
    <div className={styles.main}>
      <div className={styles.header}>
        <Skeleton circle width={42} height={42} className={styles.avatar} />
        <div className={styles.headerText}>
          <Skeleton width="45%" height={24} />
          <Skeleton width="25%" height={14} />
        </div>
      </div>
      <div className={styles.cards}>
        <Skeleton className={styles.card} />
        <Skeleton className={styles.card} />
        <Skeleton className={styles.card} />
      </div>
    </div>
  </div>
);

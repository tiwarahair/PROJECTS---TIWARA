import Skeleton from "react-loading-skeleton";
import styles from "../../styles/components/skeleton/stylist-card-skeleton.module.css";

/** A StylistCard while it loads: photo, name, area and the facts line. */
export const StylistCardSkeleton = () => (
  <div aria-hidden="true">
    <Skeleton className={styles.cover} />
    <div className={styles.body}>
      <Skeleton width="55%" height={20} />
      <Skeleton width="80%" />
      <Skeleton width="65%" />
    </div>
  </div>
);

import Skeleton from "react-loading-skeleton";
import styles from "../../styles/components/skeleton/profile-skeleton.module.css";

/** A stylist profile while it loads: cover, name, area and a few lines of bio. */
export const ProfileSkeleton = () => (
  <div aria-hidden="true" className={styles.page}>
    <Skeleton className={styles.cover} />
    <Skeleton width="45%" height={40} className={styles.title} />
    <Skeleton width="30%" />
    <Skeleton count={3} className={styles.bio} />
  </div>
);

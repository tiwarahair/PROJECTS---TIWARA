import Skeleton from "react-loading-skeleton";
import styles from "../../styles/components/skeleton/manage-booking-skeleton.module.css";

export const ManageBookingSkeleton = () => (
  <div aria-hidden="true">
    <Skeleton width={110} height={12} />
    <Skeleton width="70%" height={36} className={styles.title} />
    <div className={styles.card}>
      <Skeleton width="45%" height={22} />
      <Skeleton width="30%" />
      <Skeleton width="55%" className={styles.fact} />
      <Skeleton width="65%" />
    </div>
    <Skeleton
      width={160}
      height={46}
      borderRadius={999}
      className={styles.button}
    />
  </div>
);

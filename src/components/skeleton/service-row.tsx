import Skeleton from "react-loading-skeleton";
import styles from "../../styles/components/skeleton/service-row.module.css";

export const ServiceRowSkeleton = () => (
  <div
    aria-hidden="true"
    data-testid="service-row-skeleton"
    className={styles.row}
  >
    <Skeleton width={22} />
    <div>
      <Skeleton width="45%" className={styles.name} />
      <Skeleton width="70%" className={styles.description} />
    </div>
  </div>
);

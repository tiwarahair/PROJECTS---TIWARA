import Skeleton from "react-loading-skeleton";
import styles from "../../styles/components/skeleton/address-row.module.css";

export const AddressRowSkeleton = () => (
  <div aria-hidden="true" className={styles.row}>
    <Skeleton circle width={16} height={16} />
    <div className={styles.text}>
      <Skeleton width="65%" />
      <Skeleton width="40%" height={12} />
    </div>
  </div>
);

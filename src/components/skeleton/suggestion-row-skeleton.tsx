import Skeleton from "react-loading-skeleton";
import styles from "../../styles/components/skeleton/suggestion-row-skeleton.module.css";

/** A dropdown suggestion while it loads: round icon, label and sub-line. */
export const SuggestionRowSkeleton = () => (
  <div aria-hidden="true" className={styles.row}>
    <Skeleton circle width={36} height={36} />
    <div className={styles.text}>
      <Skeleton width="60%" />
      <Skeleton width="40%" height={12} />
    </div>
  </div>
);

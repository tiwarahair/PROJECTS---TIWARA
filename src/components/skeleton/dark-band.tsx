import Skeleton from "react-loading-skeleton";
import { joinClassNames } from "../../utils/class-names";
import styles from "../../styles/components/skeleton/dark-band.module.css";

interface DarkBandSkeletonProps {
  variant: "chip" | "name";
}

export const DarkBandSkeleton = ({ variant }: DarkBandSkeletonProps) => (
  <span
    aria-hidden="true"
    data-testid="dark-band-skeleton"
    className={styles.container}
  >
    <Skeleton className={joinClassNames(styles.bar, styles[variant])} />
  </span>
);

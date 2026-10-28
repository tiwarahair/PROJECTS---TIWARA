import Skeleton from "react-loading-skeleton";
import styles from "../../styles/components/skeleton/look-tile.module.css";

export const LookTileSkeleton = () => (
  <div
    aria-hidden="true"
    data-testid="look-tile-skeleton"
    className={styles.tile}
  >
    <Skeleton containerClassName={styles.fill} className={styles.photo} />
  </div>
);

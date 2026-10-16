import type { ReactNode } from "react";
import styles from "../../../../styles/features/studio/bookings/steps/option-group.module.css";

interface OptionGroupProps {
  category: string;
  count: string;
  children: ReactNode;
}

export const OptionGroup = ({
  category,
  count,
  children,
}: OptionGroupProps) => (
  <div className={styles.group}>
    <div className={styles.groupHead}>
      <span className={styles.h3}>{category}</span>
      <span className={styles.count}>{count}</span>
    </div>
    <div className={styles.stack6}>{children}</div>
  </div>
);

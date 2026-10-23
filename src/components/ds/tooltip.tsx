import { useState } from "react";
import type { ReactNode } from "react";
import { joinClassNames } from "../../utils/class-names";
import styles from "../../styles/components/ds/tooltip.module.css";

/** hover (or focus) tooltip, a ink pop-up above or below the child */
export interface TooltipProps {
  label: string;
  children?: ReactNode;
  placement?: "above" | "below";
}

export const Tooltip = ({
  label,
  children,
  placement = "above",
}: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <span
      className={styles.wrapper}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <span
          role="tooltip"
          className={joinClassNames(
            styles.bubble,
            placement === "below" && styles.below,
          )}
        >
          {label}
        </span>
      )}
    </span>
  );
};

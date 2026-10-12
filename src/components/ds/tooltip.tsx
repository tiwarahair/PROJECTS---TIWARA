import { useState } from "react";
import type { ReactNode } from "react";
import styles from "./tooltip.module.css";

/** Hover tooltip, ink bubble above the child. */
export interface TooltipProps {
  label: string;
  children?: ReactNode;
}

export const Tooltip = ({ label, children }: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <span
      className={styles.wrapper}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <span role="tooltip" className={styles.bubble}>
          {label}
        </span>
      )}
    </span>
  );
};

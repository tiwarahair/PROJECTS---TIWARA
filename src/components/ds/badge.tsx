import type { CSSProperties, ReactNode } from "react";
import { joinClassNames } from "../../utils/class-names";
import styles from "./badge.module.css";

/** Pill status label. */
export interface BadgeProps {
  tone?: "neutral" | "accent" | "success" | "warning" | "danger" | "ink";
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
}

export const Badge = ({
  tone = "neutral",
  children,
  style,
  className,
}: BadgeProps) => (
  <span
    className={joinClassNames(styles.badge, styles[tone], className)}
    style={style}
  >
    {children}
  </span>
);

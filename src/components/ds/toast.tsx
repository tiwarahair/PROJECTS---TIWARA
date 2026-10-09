import type { CSSProperties, ReactNode } from "react";
import { joinClassNames } from "../../utils/class-names";
import styles from "./toast.module.css";

/** Ink toast with tone dot; brief factual messages. */
export interface ToastProps {
  tone?: "neutral" | "success" | "warning" | "danger";
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
}

export const Toast = ({
  tone = "neutral",
  children,
  style,
  className,
}: ToastProps) => (
  <div
    role="status"
    className={joinClassNames(styles.toast, className)}
    style={style}
  >
    <span className={joinClassNames(styles.dot, styles[tone])}></span>
    {children}
  </div>
);

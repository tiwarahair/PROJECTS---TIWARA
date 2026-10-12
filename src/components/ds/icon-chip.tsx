import type { CSSProperties, ReactNode } from "react";
import { joinClassNames } from "../../utils/class-names";
import styles from "../../styles/components/ds/icon-chip.module.css";

/** Non-interactive circular tint holding an icon; the static counterpart to IconButton's tint. */
export interface IconChipProps {
  /** sm 34px · md 42px · lg 44px */
  size?: "sm" | "md" | "lg";
  /** Glyph colour. accent = crimson (default), muted = empty states, ink = neutral */
  tone?: "accent" | "muted" | "ink";
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
}

export const IconChip = ({
  size = "md",
  tone = "accent",
  children,
  style,
  className,
}: IconChipProps) => (
  <span
    aria-hidden="true"
    className={joinClassNames(
      styles.iconChip,
      styles[size],
      styles[tone],
      className,
    )}
    style={style}
  >
    {children}
  </span>
);

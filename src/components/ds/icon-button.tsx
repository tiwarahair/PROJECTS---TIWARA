import type { ButtonHTMLAttributes } from "react";
import { joinClassNames } from "../../utils/class-names";
import styles from "../../styles/components/ds/icon-button.module.css";

/** Circular icon-only button — the pill applied to a square. Always pass a label. */
export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible label (required) */
  label: string;
  /** tint = quiet fill with a crimson glyph and no border; outline = --border-strong hairline, no fill. */
  variant?: "ghost" | "tint" | "outline" | "primary";
  /** Over photography: the over-media recipe and no border. */
  onMedia?: boolean;
  /** sm 34px (desktop only) · md 44px · lg 52px */
  size?: "sm" | "md" | "lg";
}

export const IconButton = ({
  label,
  variant = "ghost",
  size = "md",
  onMedia = false,
  disabled = false,
  children,
  onClick,
  className,
  type = "button",
  ...rest
}: IconButtonProps) => (
  <button
    type={type}
    aria-label={label}
    title={label}
    onClick={disabled ? undefined : onClick}
    disabled={disabled}
    className={joinClassNames(
      styles.iconButton,
      styles[size],
      styles[variant],
      onMedia && styles.onMedia,
      className,
    )}
    {...rest}
  >
    {children}
  </button>
);

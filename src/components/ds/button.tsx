import type { ButtonHTMLAttributes, ReactNode } from "react";
import { joinClassNames } from "../../utils/class-names";
import styles from "../../styles/components/ds/button.module.css";

/**
 * The button. One shape everywhere — pill (`--radius-full`) — on marketing pages,
 * the booking flow and the Studio dashboard alike. Two axes vary: `variant` changes
 * colour, `cta` changes casing. Neither changes the shape.
 */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary = crimson (one per view), secondary = ink, tertiary = quiet fill, outline = ink border filling ink on hover, ghost = bare. */
  variant?: "primary" | "secondary" | "tertiary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  /** Marketing hero and nav CTAs only: UPPERCASE, 0.14em tracking, 10.5/11/12px, 1.5px border. */
  cta?: boolean;
  /** Optional leading icon node, 16–18px inline SVG */
  icon?: ReactNode;
}

export const Button = ({
  variant = "primary",
  size = "md",
  cta = false,
  disabled = false,
  icon = null,
  children,
  onClick,
  className,
  type = "button",
  ...rest
}: ButtonProps) => (
  <button
    type={type}
    onClick={disabled ? undefined : onClick}
    disabled={disabled}
    className={joinClassNames(
      styles.button,
      styles[size],
      cta && styles.cta,
      styles[variant],
      className,
    )}
    {...rest}
  >
    {icon}
    {children}
  </button>
);

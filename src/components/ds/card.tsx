import type { CSSProperties, ReactNode } from "react";
import { joinClassNames } from "../../utils/class-names";
import styles from "./card.module.css";

/** Container assigned by behaviour, not appearance. There is no default card: 'flow' has no box unless tappable. */
export interface CardProps {
  /** flow = content in the flow · panel = level 1b dashboard module · float = level 2 */
  level?: "flow" | "panel" | "float";
  padding?: number | string;
  /** Forces the level-1 hairline on or off; `onClick` implies it. Ignored by panel and float. */
  tappable?: boolean;
  onClick?: () => void;
  /** Large-control selected state: --accent-wash fill, 1px --accent-700 border, label to --accent-700. */
  selected?: boolean;
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
}

export const Card = ({
  level = "flow",
  padding = 24,
  tappable,
  selected = false,
  onClick,
  children,
  style,
  className,
}: CardProps) => {
  // The hairline is the resting outline of an interactive thing. onClick implies it.
  const isBounded = tappable ?? !!onClick;

  return (
    <div
      onClick={onClick}
      className={joinClassNames(
        styles.card,
        styles[level],
        (isBounded || selected) && styles.bounded,
        tappable && styles.tappable,
        selected && styles.selected,
        className,
      )}
      // --card-padding: the padding prop accepts any number or CSS length
      style={
        {
          "--card-padding":
            typeof padding === "number" ? `${padding}px` : padding,
          ...style,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
};

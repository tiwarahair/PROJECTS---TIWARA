import type { CSSProperties, ReactNode } from "react";
import { joinClassNames } from "../../utils/class-names";
import styles from "../../styles/components/ds/tag.module.css";

/** Small mark (no onClick) or chip (onClick) at --radius-xs. */
export interface TagProps {
  /** Interactive chips only: the small-control fill flip. */
  selected?: boolean;
  /** Passing this makes the tag a control: no fill at rest, 1px --border-subtle, hover to --fill-quiet. */
  onClick?: () => void;
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
}

export const Tag = ({
  selected = false,
  onClick,
  children,
  style,
  className,
}: TagProps) => {
  const isControl = !!onClick;

  return (
    <button
      type="button"
      onClick={onClick}
      className={joinClassNames(
        styles.tag,
        isControl ? styles.control : styles.mark,
        isControl && selected && styles.selected,
        className,
      )}
      style={style}
    >
      {children}
    </button>
  );
};

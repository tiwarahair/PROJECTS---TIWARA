import { useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { createPortal } from "react-dom";
import { joinClassNames } from "../../utils/class-names";
import styles from "../../styles/components/ds/tooltip.module.css";

/** hover (or focus) tooltip, a ink pop-up above or below the child */
export interface TooltipProps {
  label: string;
  children?: ReactNode;
  placement?: "above" | "below";
  isFloating?: boolean; // so a scrolling box (a sheet) doesn't cut it off
}

export const Tooltip = ({
  label,
  children,
  placement = "above",
  isFloating = false,
}: TooltipProps) => {
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const [position, setPosition] = useState<CSSProperties | null>(null);

  const show = () => {
    const rect = wrapperRef.current?.getBoundingClientRect();

    // runtime: the trigger's place on screen, for a floating tooltip
    setPosition(
      isFloating && rect
        ? ({
            "--tip-x": `${rect.left + rect.width / 2}px`,
            "--tip-y": `${placement === "below" ? rect.bottom : rect.top}px`,
          } as CSSProperties)
        : {},
    );
  };

  const bubble = position && (
    <span
      role="tooltip"
      className={joinClassNames(
        styles.bubble,
        placement === "below" && styles.below,
        isFloating && styles.floating,
      )}
      style={isFloating ? position : undefined}
    >
      {label}
    </span>
  );

  return (
    <span
      ref={wrapperRef}
      className={styles.wrapper}
      onMouseEnter={show}
      onMouseLeave={() => setPosition(null)}
      onFocus={show}
      onBlur={() => setPosition(null)}
    >
      {children}
      {isFloating && bubble ? createPortal(bubble, document.body) : bubble}
    </span>
  );
};

import type { CSSProperties, ReactNode } from "react";
import styles from "../../styles/components/ds/dialog.module.css";

/** Modal dialog: 24px radius, overlay shadow, scrim click closes. */
export interface DialogProps {
  open?: boolean;
  title?: ReactNode;
  onClose?: () => void;
  /** Action row, right-aligned (Buttons) */
  footer?: ReactNode;
  children?: ReactNode;
  width?: number;
}

export const Dialog = ({
  open = false,
  title,
  onClose,
  footer,
  children,
  width = 440,
}: DialogProps) => {
  if (!open) return null;

  return (
    <div className={styles.scrim} onClick={onClose}>
      <div
        className={styles.panel}
        onClick={(event) => event.stopPropagation()}
        // --dialog-width: the width prop is any pixel value
        style={{ "--dialog-width": `${width}px` } as CSSProperties}
      >
        <div className={styles.header}>
          <div className={styles.title}>{title}</div>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Close"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  );
};

import type { ReactNode } from "react";
import { cx } from "../../utils/class-names";

export interface GuideModalProps {
  id: string;
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Stays mounted and toggles `.open`: the overlay fades and the inner panel
 * scales from 0.96, so unmounting would drop both transitions.
 */
export const GuideModal = ({
  id,
  title,
  open,
  onClose,
  children,
}: GuideModalProps) => (
  <div
    id={id}
    className={cx("guide-modal-overlay", open && "open")}
    // Backdrop only — a click inside the panel must not close the modal.
    onClick={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}
  >
    <div className="guide-modal">
      <div className="guide-modal-head">
        <span className="guide-modal-title">{title}</span>
        <button className="guide-modal-close" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="guide-modal-body">{children}</div>
    </div>
  </div>
);

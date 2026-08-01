import type { ReactNode } from "react";
import { cx } from "../../utils/class-names";
import { useAppDispatch, useAppSelector } from "../../stores/hooks";
import { pageClosed } from "../../stores/overlays-slice";
import type { SimpleOverlayId } from "../../types/overlays";

export interface PageOverlayProps {
  id: SimpleOverlayId;
  domId: string;
  children: ReactNode;
}

/**
 * Shared chrome for the full-page overlays (About, For Stylists, Shop).
 * Stays mounted and toggles `.open`, which drives the slide-in transition.
 */
export function PageOverlay({ id, domId, children }: PageOverlayProps) {
  const dispatch = useAppDispatch();
  const open = useAppSelector((state) => state.overlays.overlay[id]);
  const close = () => dispatch(pageClosed(id));

  return (
    <div id={domId} className={cx("pg-overlay", open && "open")}>
      <div className="pg-nav">
        <a
          href="#"
          className="pg-nav-logo"
          onClick={(event) => {
            event.preventDefault();
            close();
          }}
        >
          Tiwara&apos;s House<sup>✦</sup>
        </a>
        <button className="pg-close" onClick={close}>
          ✕ Close
        </button>
      </div>
      {children}
    </div>
  );
}

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Link } from "react-router";
import { useEntered } from "../../hooks/use-entered";
import { useAppDispatch, useAppSelector } from "../../stores/hooks";
import { saveFavourite } from "../../stores/favourites-slice";
import { clearToast } from "../../stores/toast-slice";
import type { ToastMessage } from "../../stores/toast-slice";
import styles from "../../styles/components/action-toast/index.module.css";

const EXIT_MS = 260;

interface ToastPillProps {
  toast: ToastMessage;
}

const ToastPill = ({ toast }: ToastPillProps) => {
  const { id, message, action, bottom } = toast;
  const dispatch = useAppDispatch();
  const entered = useEntered();
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!closing) return;

    const timer = window.setTimeout(() => dispatch(clearToast(id)), EXIT_MS);

    return () => window.clearTimeout(timer);
  }, [closing, dispatch, id]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setClosing(true),
      action ? 5000 : 3200,
    );

    return () => window.clearTimeout(timer);
  }, [action]);

  const className = [
    styles.toast,
    action && styles.withAction,
    entered && !closing && styles.entered,
    closing && styles.closing,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    // --toast-bottom: per-toast offset (24px default, 84px after a pending favourite is saved)
    <div
      role="status"
      className={className}
      style={{ "--toast-bottom": `${bottom}px` } as CSSProperties}
    >
      <span>{message}</span>
      {action?.href && (
        <Link className={styles.action} to={action.href}>
          {action.label}
        </Link>
      )}
      {action && !action.href && (
        <button
          type="button"
          className={styles.action}
          onClick={() => {
            if (!action.undoFavouriteId) return;

            void dispatch(
              saveFavourite({ id: action.undoFavouriteId, on: true }),
            );

            setClosing(true);
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

/** The single favourites/share toast; a new toast replaces the old one immediately. */
export const ActionToast = () => {
  const toast = useAppSelector((state) => state.toast.current);

  return toast ? <ToastPill key={toast.id} toast={toast} /> : null;
};

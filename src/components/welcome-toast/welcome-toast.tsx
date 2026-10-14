import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router";
import { useEntered } from "../../hooks/use-entered";
import { joinClassNames } from "../../utils/class-names";
import styles from "../../styles/components/welcome-toast/welcome-toast.module.css";

interface WelcomeToastPillProps {
  message: string;
  pinned: boolean;
  onDone: () => void;
}

const WelcomeToastPill = ({
  message,
  pinned,
  onDone,
}: WelcomeToastPillProps) => {
  const entered = useEntered();
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (pinned) return;

    const closeTimer = window.setTimeout(() => setClosing(true), 4000);

    return () => window.clearTimeout(closeTimer);
  }, [pinned]);

  useEffect(() => {
    if (!closing) return;

    const removeTimer = window.setTimeout(onDone, 260);

    return () => window.clearTimeout(removeTimer);
  }, [closing, onDone]);

  return (
    <div
      role="status"
      className={joinClassNames(
        styles.toast,
        entered && !closing && styles.entered,
        closing && styles.closing,
      )}
    >
      <svg
        className={styles.icon}
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#DFCF3E"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 12l5 5L20 7"></path>
      </svg>
      <span>{message}</span>
    </div>
  );
};

interface WelcomeMessage {
  message: string;
  pinned: boolean;
}

const readWelcomeMessage = (search: string): WelcomeMessage | null => {
  try {
    const pinnedMessage = new URLSearchParams(search).get("twtoast");

    if (pinnedMessage) return { message: pinnedMessage, pinned: true };

    const stored = window.sessionStorage.getItem("tw_toast");

    window.sessionStorage.removeItem("tw_toast");

    return stored ? { message: stored, pinned: false } : null;
  } catch {
    return null;
  }
};

/**
 * "Welcome back, {first}" after log in / sign up (shown on Home, Search,
 * Stylist Profile and Booking). Reads ?twtoast= (pinned, boards) or sessionStorage tw_toast once on mount.
 */
export const WelcomeToast = () => {
  const { search } = useLocation();
  const [toast, setToast] = useState(() => readWelcomeMessage(search));
  const [visible, setVisible] = useState(false);
  const handleDone = useCallback(() => setToast(null), []);
  const hasToast = !!toast;

  useEffect(() => {
    if (!hasToast) return;

    const showTimer = window.setTimeout(() => setVisible(true), 600);

    return () => window.clearTimeout(showTimer);
  }, [hasToast]);

  if (!toast || !visible) return null;

  return (
    <WelcomeToastPill
      message={toast.message}
      pinned={toast.pinned}
      onDone={handleDone}
    />
  );
};

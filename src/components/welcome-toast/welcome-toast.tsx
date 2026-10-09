import { useCallback, useEffect, useState } from "react";
import { useEntered } from "../../hooks/use-entered";
import styles from "./welcome-toast.module.css";

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

  const className = [
    styles.toast,
    entered && !closing && styles.entered,
    closing && styles.closing,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div role="status" className={className}>
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

const readWelcomeMessage = (): { message: string; pinned: boolean } | null => {
  try {
    const pinnedMessage = new URLSearchParams(window.location.search).get(
      "twtoast",
    );
    if (pinnedMessage) return { message: pinnedMessage, pinned: true };
    const stored = window.sessionStorage.getItem("tw_toast");
    window.sessionStorage.removeItem("tw_toast");
    return stored ? { message: stored, pinned: false } : null;
  } catch {
    return null;
  }
};

/**
 * "Welcome back, {first}" after log in / sign up (prototype tw-toast.js, loaded by Home, Search,
 * Stylist Profile and Booking). Reads ?twtoast= (pinned, boards) or sessionStorage tw_toast once on mount.
 */
export const WelcomeToast = () => {
  const [toast, setToast] = useState<{
    message: string;
    pinned: boolean;
  } | null>(null);
  const [visible, setVisible] = useState(false);
  const handleDone = useCallback(() => setToast(null), []);

  useEffect(() => {
    const welcome = readWelcomeMessage();
    if (!welcome) return;
    setToast(welcome);
    const showTimer = window.setTimeout(() => setVisible(true), 600);
    return () => window.clearTimeout(showTimer);
  }, []);

  if (!toast || !visible) return null;
  return (
    <WelcomeToastPill
      message={toast.message}
      pinned={toast.pinned}
      onDone={handleDone}
    />
  );
};

import { useCallback, useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { useLocation } from "react-router";
import { useEntered } from "../../hooks/use-entered";
import { joinClassNames } from "../../utils/class-names";
import styles from "../../styles/components/welcome-toast/index.module.css";

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
      <Check
        className={styles.icon}
        size={18}
        color="#DFCF3E"
        strokeWidth={2.2}
      />
      <span>{message}</span>
    </div>
  );
};

const TOAST_EVENT = "tw-toast";

/** Shows a message in the toast on the next page, or on this one if it's already showing a toast spot. */
export const queueSiteToast = (message: string) => {
  try {
    window.sessionStorage.setItem("tw_toast", message);
  } catch {
    // storage unavailable: the event below still reaches a mounted toast
  }

  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: message }));
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
  const [toast, setToast] = useState<WelcomeMessage | null>(null);

  const [visible, setVisible] = useState(false);
  const handleDone = useCallback(() => setToast(null), []);
  const { search } = useLocation();
  // read once on mount, like the sessionStorage message
  const mountSearch = useRef(search);

  useEffect(() => {
    const welcome = readWelcomeMessage(mountSearch.current);

    let showTimer = 0;

    // the stored message is cleared once it shows, so a page that remounts straight away still gets it
    const show = (message: WelcomeMessage) => {
      setToast(message);
      window.clearTimeout(showTimer);

      showTimer = window.setTimeout(() => {
        try {
          window.sessionStorage.removeItem("tw_toast");
        } catch {
          // storage unavailable: nothing to clear
        }

        setVisible(true);
      }, 600);
    };

    // a message queued while this page is already open (e.g. logging out on Home)
    const onQueued = (event: Event) =>
      show({ message: (event as CustomEvent<string>).detail, pinned: false });

    if (welcome) show(welcome);

    window.addEventListener(TOAST_EVENT, onQueued);

    return () => {
      window.clearTimeout(showTimer);
      window.removeEventListener(TOAST_EVENT, onQueued);
    };
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

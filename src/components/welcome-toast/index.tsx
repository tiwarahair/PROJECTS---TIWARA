import { useCallback, useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useEntered } from "../../hooks/use-entered";
import { joinClassNames } from "../../utils/class-names";
import styles from "../../styles/components/welcome-toast/index.module.css";

interface WelcomeToastPillProps {
  message: string;
  onDone: () => void;
}

const WelcomeToastPill = ({ message, onDone }: WelcomeToastPillProps) => {
  const entered = useEntered();
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const closeTimer = window.setTimeout(() => setClosing(true), 4000);

    return () => window.clearTimeout(closeTimer);
  }, []);

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

const readWelcomeMessage = (): string | null => {
  try {
    return window.sessionStorage.getItem("tw_toast");
  } catch {
    return null;
  }
};

/**
 * "Welcome back, {first}" after log in / sign up (shown on Home, Search,
 * Stylist Profile and Booking). Reads sessionStorage tw_toast once on mount.
 */
export const WelcomeToast = () => {
  const [toast, setToast] = useState<string | null>(null);

  const [visible, setVisible] = useState(false);
  const handleDone = useCallback(() => setToast(null), []);

  useEffect(() => {
    const welcome = readWelcomeMessage();

    let showTimer = 0;

    // the stored message is cleared once it shows, so a page that remounts straight away still gets it
    const show = (message: string) => {
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
      show((event as CustomEvent<string>).detail);

    if (welcome) show(welcome);

    window.addEventListener(TOAST_EVENT, onQueued);

    return () => {
      window.clearTimeout(showTimer);
      window.removeEventListener(TOAST_EVENT, onQueued);
    };
  }, []);

  if (!toast || !visible) return null;

  return <WelcomeToastPill message={toast} onDone={handleDone} />;
};

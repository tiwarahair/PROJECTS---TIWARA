import { Check, X } from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import styles from "../../styles/features/booking/turnstile-fallback.module.css";
import type { BookingController } from "./use-booking";

interface TurnstileFallbackProps {
  booking: BookingController;
}

const LABELS = {
  idle: "Verify you are human",
  checking: "Verifying…",
  passed: "Success!",
  fail: "Verification failed",
};

/** Simulated Cloudflare Turnstile challenge (?turnstile=challenge|fail): blocks Pay until it passes. */
export const TurnstileFallback = ({ booking }: TurnstileFallbackProps) => {
  const { state, actions } = booking;
  const { turnstileStatus } = state;

  const verify = () => {
    if (turnstileStatus !== "idle") return;

    actions.setState({ turnstileStatus: "checking" });

    // the demo check takes 1.1s, then passes (or fails with ?turnstile=fail)
    window.setTimeout(
      () =>
        actions.setState((current) => ({
          turnstileStatus: current.turnstileMode === "fail" ? "fail" : "passed",
        })),
      1100,
    );
  };

  return (
    <div data-screen-label="Turnstile fallback" className={styles.wrap}>
      <div className={styles.widget}>
        <label
          className={joinClassNames(
            styles.label,
            turnstileStatus === "idle" ? styles.labelIdle : styles.labelBusy,
          )}
        >
          {turnstileStatus === "idle" && (
            <input
              type="checkbox"
              checked={false}
              onChange={verify}
              aria-label="Verify you are human"
              className={styles.checkbox}
            />
          )}
          {turnstileStatus === "checking" && (
            <span aria-hidden="true" className={styles.spinner}></span>
          )}
          {turnstileStatus === "passed" && (
            <span aria-hidden="true" className={styles.ok}>
              <Check size={14} strokeWidth={3} className={styles.markIcon} />
            </span>
          )}
          {turnstileStatus === "fail" && (
            <span aria-hidden="true" className={styles.failed}>
              <X size={14} strokeWidth={3} className={styles.markIcon} />
            </span>
          )}
          <span role="status" aria-live="polite" className={styles.status}>
            {LABELS[turnstileStatus]}
          </span>
        </label>
        <span className={styles.brand}>
          <span className={styles.cloudflare}>CLOUDFLARE</span>
          <span className={styles.legal}>Privacy · Terms</span>
        </span>
      </div>
      {turnstileStatus === "fail" && (
        <div role="alert" className={styles.failNote}>
          {
            "We couldn't check you're not a robot. Refresh the page and try again."
          }
        </div>
      )}
    </div>
  );
};

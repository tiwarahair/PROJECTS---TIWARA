import { joinClassNames } from "../../utils/class-names";
import styles from "./turnstile-fallback.module.css";
import type { BookingController } from "./use-booking";

interface TurnstileFallbackProps {
  booking: BookingController;
}

const LABELS = {
  idle: "Verify you are human",
  checking: "Verifying…",
  ok: "Success!",
  fail: "Verification failed",
};

/** Simulated Cloudflare Turnstile challenge (?turnstile=challenge|fail): blocks Pay until it passes. */
export const TurnstileFallback = ({ booking }: TurnstileFallbackProps) => {
  const { state, actions } = booking;
  const { ts } = state;
  const verify = () => {
    if (ts !== "idle") return;
    actions.setState({ ts: "checking" });
    // the demo check takes 1.1s, then passes (or fails with ?turnstile=fail)
    window.setTimeout(
      () =>
        actions.setState((current) => ({
          ts: current.tsMode === "fail" ? "fail" : "ok",
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
            ts === "idle" ? styles.labelIdle : styles.labelBusy,
          )}
        >
          {ts === "idle" && (
            <input
              type="checkbox"
              checked={false}
              onChange={verify}
              aria-label="Verify you are human"
              className={styles.checkbox}
            />
          )}
          {ts === "checking" && (
            <span aria-hidden="true" className={styles.spinner}></span>
          )}
          {ts === "ok" && (
            <span aria-hidden="true" className={styles.ok}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={styles.markIcon}
              >
                <path d="M5 12l5 5L20 7"></path>
              </svg>
            </span>
          )}
          {ts === "fail" && (
            <span aria-hidden="true" className={styles.failed}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                className={styles.markIcon}
              >
                <path d="M18 6 6 18M6 6l12 12"></path>
              </svg>
            </span>
          )}
          <span role="status" aria-live="polite" className={styles.status}>
            {LABELS[ts]}
          </span>
        </label>
        <span className={styles.brand}>
          <span className={styles.cloudflare}>CLOUDFLARE</span>
          <span className={styles.legal}>Privacy · Terms</span>
        </span>
      </div>
      {ts === "fail" && (
        <div role="alert" className={styles.failNote}>
          {
            "We couldn't check you're not a robot. Refresh the page and try again."
          }
        </div>
      )}
    </div>
  );
};

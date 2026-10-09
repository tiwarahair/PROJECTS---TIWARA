import { joinClassNames } from "../../utils/class-names";
import type { TurnstileState } from "./onboarding-state";
import styles from "./ob-turnstile.module.css";

interface ObTurnstileProps {
  ts: TurnstileState;
  isDark: boolean;
  onCheck: () => void;
  /** The wizard's error line is crimson; the shell's follows --ob-err. */
  inWizard?: boolean;
}

const LABELS: Record<TurnstileState, string> = {
  idle: "Verify you are human",
  checking: "Verifying…",
  ok: "Success!",
  fail: "Verification failed",
};

/** Simulated Cloudflare Turnstile fallback (?turnstile=challenge|fail), light or dark. */
export const ObTurnstile = ({
  ts,
  isDark,
  onCheck,
  inWizard,
}: ObTurnstileProps) => (
  <div className={styles.wrap}>
    <div
      className={joinClassNames(
        styles.widget,
        isDark ? styles.widgetDark : styles.widgetLight,
      )}
    >
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
            onChange={onCheck}
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
    <div role="alert" className={inWizard ? styles.errorWizard : styles.error}>
      {ts === "fail"
        ? "We couldn’t check you’re not a robot. Refresh the page and try again."
        : ""}
    </div>
  </div>
);

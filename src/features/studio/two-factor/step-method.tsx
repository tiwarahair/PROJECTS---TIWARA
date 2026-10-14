import { Smartphone } from "lucide-react";
import { SmsRow } from "./two-factor-fields";
import type { TwoFactorView } from "./two-factor-view";
import styles from "../../../styles/features/studio/two-factor/two-factor.module.css";

interface StepMethodProps {
  view: TwoFactorView;
}

/** Choose how codes arrive: an authenticator app (SMS is coming soon). */
export const StepMethod = ({ view }: StepMethodProps) => (
  <>
    <div
      className={styles.radios}
      role="radiogroup"
      aria-label="Verification method"
    >
      <button className={styles.app} role="radio" aria-checked="true">
        <span className={styles.appIcon}>
          <Smartphone size={18} strokeWidth={1.7} />
        </span>
        <span className={styles.grow}>
          <span className={styles.titleRow}>
            <span className={styles.appName}>Authenticator app</span>
            <span className={styles.recommended}>Recommended</span>
          </span>
          <span className={styles.appSub}>
            Use a free app like Google Authenticator, Microsoft Authenticator or
            your password manager.
          </span>
        </span>
        <span className={styles.ring} aria-hidden="true">
          <span className={styles.ringDot}></span>
        </span>
      </button>
      <SmsRow />
    </div>
    <button className={styles.primary} onClick={view.toApp}>
      Continue
    </button>
  </>
);

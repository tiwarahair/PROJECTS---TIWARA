import { Shield } from "lucide-react";
import { joinClassNames } from "../../../../utils/class-names";
import type { AddBookingView } from "./view";
import styles from "../../../../styles/features/studio/bookings/add/protection-step.module.css";
import shared from "../../../../styles/features/studio/bookings/add/index.module.css";

interface ProtectionStepProps {
  view: AddBookingView;
}

/** Step 4: send a payment link or book without protection. */
export const ProtectionStep = ({ view }: ProtectionStepProps) => (
  <>
    <div className={shared.label145}>Booking protection</div>
    <div className={styles.policyRow}>
      <Shield
        className={styles.policyIcon}
        size={16}
        strokeWidth={1.7}
        color="var(--text-secondary)"
      />
      <div className={styles.policyText}>
        Your policy requires{" "}
        <span className={styles.strong}>{view.protectionNoun}</span> to confirm.
      </div>
    </div>
    <div className={styles.protOptions}>
      {view.protectionOptions.map(
        ({ key, label, subtitle, isOn, isOff, pick }) => (
          <button
            key={key}
            className={joinClassNames(
              styles.protOption,
              isOn && styles.protOptionOn,
              isOff && styles.protOptionOff,
            )}
            onClick={pick}
            disabled={isOff}
          >
            <span className={styles.radio}>
              <span className={styles.dot}></span>
            </span>
            <span className={shared.grow}>
              <span className={styles.protLabel}>{label}</span>
              <span className={styles.protSub}>{subtitle}</span>
            </span>
          </button>
        ),
      )}
    </div>
    <div className={styles.protFoot}>{view.protectionFootnote}</div>
    {view.isProtectionSend && (
      <>
        <div className={styles.receives}>
          {`What ${view.firstName} receives`}
        </div>
        <div className={styles.preview}>{view.protectionPreview}</div>
      </>
    )}
  </>
);

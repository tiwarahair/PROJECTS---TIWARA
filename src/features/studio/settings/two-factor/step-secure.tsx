import { Check, Lock } from "lucide-react";
import { joinClassNames } from "../../../../utils/class-names";
import type { TwoFactorView } from "./view";
import styles from "../../../../styles/components/two-factor/index.module.css";

interface StepSecureProps {
  view: TwoFactorView;
}

/** The overview: 2FA, tax details and Stripe, each unlocking the next. */
export const StepSecure = ({ view }: StepSecureProps) => (
  <div className={styles.parts}>
    {view.parts.map((part) => {
      const isLocked = !part.isDone && !part.isUnlocked;

      return (
        <div
          key={part.key}
          className={styles.part}
          aria-disabled={isLocked ? "true" : "false"}
        >
          {part.isDone ? (
            <span className={styles.partDone}>
              <Check size={14} strokeWidth={3} />
            </span>
          ) : (
            <span
              className={joinClassNames(
                styles.partNumber,
                isLocked && styles.locked,
              )}
            >
              {part.stepNumber}
            </span>
          )}
          <div className={styles.grow}>
            <div
              className={joinClassNames(
                styles.partLabel,
                isLocked && styles.locked,
              )}
            >
              {part.label}
            </div>
            <div className={styles.partSub}>{part.subtitle}</div>
          </div>
          {!part.isDone && part.isUnlocked && (
            <button className={styles.partButton} onClick={part.onSelect}>
              {part.buttonLabel}
            </button>
          )}
          {isLocked && (
            <span className={styles.lock} aria-hidden="true">
              <Lock size={17} strokeWidth={1.7} />
            </span>
          )}
        </div>
      );
    })}
  </div>
);

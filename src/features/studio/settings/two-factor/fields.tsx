import { MessageSquare } from "lucide-react";
import type { ReactNode } from "react";
import { joinClassNames } from "../../../../utils/class-names";
import type { TwoFactorView } from "./view";
import styles from "../../../../styles/components/two-factor/index.module.css";

/** The disabled "Text message (SMS) · Coming soon" row. */
export const SmsRow = () => (
  <div className={styles.sms} aria-disabled="true">
    <span className={styles.smsIcon}>
      <MessageSquare size={18} strokeWidth={1.7} />
    </span>
    <div className={styles.smsText}>
      <span className={styles.title15}>Text message (SMS)</span>
      <span className={styles.soon}>Coming soon</span>
    </div>
  </div>
);

interface BackupOptionProps {
  option: TwoFactorView["optionDevice"];
  label: string;
  icon: ReactNode;
}

export const BackupOption = ({ option, label, icon }: BackupOptionProps) => (
  <button
    className={joinClassNames(styles.option, option.isOn && styles.optionOn)}
    role="radio"
    aria-checked={option.isOn ? "true" : "false"}
    onClick={option.pick}
  >
    <span className={styles.optionIcon}>{icon}</span>
    <span className={styles.optionLabel}>{label}</span>
    <span className={styles.optionRing} aria-hidden="true">
      <span className={styles.optionDot}></span>
    </span>
  </button>
);

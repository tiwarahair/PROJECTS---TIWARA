import { MessageSquare } from "lucide-react";
import type { ReactNode } from "react";
import { joinClassNames } from "../../../../utils/class-names";
import type { TwoFactorView } from "./view";
import styles from "../../../../styles/features/studio/settings/two-factor/index.module.css";

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

interface CodeFieldProps {
  view: Pick<
    TwoFactorView,
    "code" | "onCode" | "isCodeError" | "errorMessage" | "isVerified"
  >;
  label: string;
}

/** The 6-digit code field shared by the tax-code, app and remove steps. */
export const CodeField = ({ view, label }: CodeFieldProps) => (
  <>
    <label className={styles.label} htmlFor="tf-code">
      {label}
    </label>
    <input
      id="tf-code"
      className={joinClassNames(
        styles.code,
        view.isCodeError && styles.inputError,
      )}
      value={view.code}
      onChange={view.onCode}
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={6}
      readOnly={view.isVerified}
      aria-invalid={view.isCodeError ? "true" : "false"}
    />
    {view.isCodeError && (
      <div className={styles.error} role="alert">
        {view.errorMessage}
      </div>
    )}
  </>
);

interface BusyButtonProps {
  className?: string;
  isBusy: boolean;
  label: string;
  onClick: () => void;
}

/** Shows a spinner while the code is checked; the label stays for screen readers. */
export const BusyButton = ({
  className,
  isBusy,
  label,
  onClick,
}: BusyButtonProps) => (
  <button
    className={className}
    onClick={onClick}
    disabled={isBusy}
    aria-busy={isBusy}
    aria-label={label}
  >
    {isBusy ? <span className={styles.spinner}></span> : label}
  </button>
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

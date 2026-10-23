import { joinClassNames } from "../../utils/class-names";
import type { AppStepView } from "./step-app";
import styles from "../../styles/components/two-factor/index.module.css";

interface CodeFieldProps {
  view: Pick<
    AppStepView,
    "code" | "onCode" | "isCodeError" | "errorMessage" | "isVerified"
  >;
  label: string;
}

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

import { joinClassNames } from "../../utils/class-names";
import type { FieldBinding } from "./fields";
import styles from "../../styles/features/onboarding/wizard-field.module.css";

interface WizardFieldProps extends FieldBinding {
  id: string;
  label: string;
  spacing?: "first" | "next";
  error: string;
  type?: string;
  inputMode?: "email";
  autoComplete: string;
  readOnly?: boolean;
}

export const WizardField = ({
  id,
  label,
  spacing = "first",
  name,
  value,
  onChange,
  onBlur,
  error,
  type,
  inputMode,
  autoComplete,
  ref,
  readOnly,
}: WizardFieldProps) => (
  <>
    <label
      htmlFor={id}
      className={spacing === "next" ? styles.labelNext : styles.label}
    >
      {label}
    </label>
    <input
      id={id}
      type={type}
      inputMode={inputMode}
      autoComplete={autoComplete}
      ref={ref}
      name={name}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      readOnly={readOnly}
      aria-invalid={error ? "true" : "false"}
      className={joinClassNames(
        styles.input,
        error ? styles.borderError : styles.border,
      )}
    />
    <div role="alert" className={styles.error}>
      {error}
    </div>
  </>
);

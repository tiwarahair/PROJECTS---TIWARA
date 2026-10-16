import type { InputHTMLAttributes, Ref } from "react";
import { joinClassNames } from "../../utils/class-names";
import type { TaxKind } from "./tax-details-logic";
import styles from "../../styles/components/tax-details-form/tax-details-form.module.css";

export const KINDS: [TaxKind, string][] = [
  ["sole", "Sole trader / self-employed"],
  ["ltd", "Limited company"],
];

export const DOB_PARTS = [
  {
    key: "day",
    placeholder: "DD",
    aria: "Day",
    max: 2,
    autoComplete: "bday-day",
  },
  {
    key: "month",
    placeholder: "MM",
    aria: "Month",
    max: 2,
    autoComplete: "bday-month",
  },
  {
    key: "year",
    placeholder: "YYYY",
    aria: "Year",
    max: 4,
    autoComplete: "bday-year",
  },
] as const;

interface FieldProps {
  id: string;
  label: string;
  error: string;
  inputProps: InputHTMLAttributes<HTMLInputElement> & {
    ref?: Ref<HTMLInputElement>;
  };
  autoComplete?: string;
  optional?: boolean;
  help?: string;
  placeholder?: string;
  isCode?: boolean;
}

/** One labelled text field with its error. */
export const Field = ({
  id,
  label,
  error,
  inputProps,
  autoComplete = "off",
  optional = false,
  help,
  placeholder,
  isCode = false,
}: FieldProps) => {
  const errorId = `${id}-e`;

  return (
    <div>
      <label
        className={help === undefined ? styles.label : styles.labelTight}
        htmlFor={id}
      >
        {label}
        {optional && <span className={styles.optional}> (optional)</span>}
      </label>
      {help !== undefined && <div className={styles.help}>{help}</div>}
      <input
        {...inputProps}
        className={joinClassNames(
          styles.input,
          error ? styles.fieldErr : styles.fieldOk,
          help !== undefined && (isCode ? styles.textCode : styles.textPlain),
        )}
        id={id}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={errorId}
      />
      {!!error && (
        <div className={styles.error} role="alert" id={errorId}>
          {error}
        </div>
      )}
    </div>
  );
};

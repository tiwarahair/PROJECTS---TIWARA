import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";
import { joinClassNames } from "../../utils/class-names";
import styles from "./input.module.css";

export interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  children?: ReactNode;
}

const getFieldMessage = ({ hint, error }: FieldProps) => {
  if (error) return <span className={styles.error}>{error}</span>;

  return hint ? <span className={styles.hint}>{hint}</span> : null;
};

export const Field = ({ label, hint, error, children }: FieldProps) => (
  <label className={styles.field}>
    {label && <span className={styles.label}>{label}</span>}
    {children}
    {getFieldMessage({ hint, error })}
  </label>
);

/** Text input with label, hint and error states. */
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = ({
  label,
  hint,
  error,
  className,
  ...rest
}: InputProps) => (
  <Field label={label} hint={hint} error={error}>
    <input
      className={joinClassNames(
        styles.control,
        error && styles.invalid,
        className,
      )}
      {...rest}
    />
  </Field>
);

/** Native select styled to match Input; pass options as strings. */
export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  options?: string[];
}

export const Select = ({
  label,
  hint,
  error,
  options = [],
  className,
  ...rest
}: SelectProps) => (
  <Field label={label} hint={hint} error={error}>
    <select
      className={joinClassNames(
        styles.control,
        styles.select,
        error && styles.invalid,
        className,
      )}
      {...rest}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </Field>
);

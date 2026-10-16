import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";
import type { FieldKey } from "./logic/types";
import fields from "../../styles/features/booking/fields.module.css";
import styles from "../../styles/features/booking/details-field.module.css";

export const ErrorIcon = () => (
  <CircleAlert size={15} strokeWidth={1.5} className={fields.errorIcon} />
);

interface FieldProps {
  fieldKey: Exclude<FieldKey, "address">;
  label: string;
  wide?: boolean;
  error: string;
  showError: boolean;
  /** The input itself, given the id, error state and border class. */
  renderInput: (props: {
    id: string;
    invalid: "true" | "false";
    describedBy: string;
    borderClass: string | undefined;
  }) => ReactNode;
  prefix?: ReactNode;
}

/** Label, input and the inline error under it. */
export const DetailsField = ({
  fieldKey,
  label,
  wide,
  error,
  showError,
  renderInput,
  prefix,
}: FieldProps) => {
  const id = `bk-${fieldKey}`;

  const input = renderInput({
    id,
    invalid: showError ? "true" : "false",
    describedBy: `${id}-err`,
    borderClass: showError ? fields.borderError : fields.border,
  });

  return (
    <div className={wide ? fields.fieldWide : fields.field}>
      <label htmlFor={id} className={fields.label}>
        {label}
      </label>
      {prefix ? (
        <span className={styles.phoneWrap}>
          {prefix}
          {input}
        </span>
      ) : (
        input
      )}
      {showError && (
        <div id={`${id}-err`} role="alert" className={fields.error}>
          <ErrorIcon />
          {error}
        </div>
      )}
    </div>
  );
};

export interface FieldErrorProps {
  /** Undefined while the field is valid, so the element stays out of the DOM. */
  message?: string;
  className?: string;
}

/** The validation message shown under a form field. */
export function FieldError({
  message,
  className = "pg-field-error",
}: FieldErrorProps) {
  if (!message) return null;
  return (
    <span className={className} role="alert">
      {message}
    </span>
  );
}

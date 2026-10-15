import type { ChangeEvent, FocusEvent, KeyboardEvent, Ref } from "react";
import { Moon, Sun } from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import styles from "../../styles/features/onboarding/onboarding-fields.module.css";
import type { AuthFailure } from "../../lib/auth-errors";
import { AuthAlert } from "./auth-alert";

/** Sun (shown in dark mode) / moon (light mode) for the theme toggle. */
export const ModeIcon = ({ isDark }: { isDark: boolean }) =>
  isDark ? (
    <Sun size={19} strokeWidth={1.8} className={styles.modeIcon} />
  ) : (
    <Moon size={19} strokeWidth={1.8} className={styles.modeIcon} />
  );

export const Spinner = ({ small }: { small?: boolean }) => (
  <span
    aria-hidden="true"
    className={small ? styles.spinnerSmall : styles.spinner}
  ></span>
);

/** "Saving…"-style primary button: dimmed and inert until the screen is valid (opacity 1 while busy). */
interface SubmitButtonProps {
  label: string;
  onClick: () => void;
  canSubmit: boolean;
  busy: boolean;
  /** Spacing variant: "tight" (14px, email), "loose" (20px), "code" (14px, no colour transition). */
  variant: "tight" | "loose" | "code";
  failure: AuthFailure | null;
  onRetry: () => void;
}

const SUBMIT_VARIANT_CLASSES = {
  tight: styles.submitTight,
  code: styles.submitCode,
  loose: styles.submitLoose,
};

export const SubmitButton = ({
  label,
  onClick,
  canSubmit,
  busy,
  variant,
  failure,
  onRetry,
}: SubmitButtonProps) => (
  <>
    <AuthAlert failure={failure} onRetry={onRetry} />
    <button
      onClick={onClick}
      disabled={!canSubmit}
      className={joinClassNames(
        SUBMIT_VARIANT_CLASSES[variant],
        canSubmit || busy ? styles.submitOn : styles.submitOff,
        canSubmit ? styles.submitReady : styles.submitInert,
      )}
    >
      {busy && <Spinner />}
      <span>{label}</span>
    </button>
  </>
);

/** What actions.field(name) returns: the value plus react-hook-form's handlers and ref. */
export interface FieldBinding {
  name?: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
  ref?: Ref<HTMLInputElement>;
}

interface TextFieldProps extends FieldBinding {
  id: string;
  label: string;
  /** Label spacing: "first" (8px under), "next" (10px above), "gap" (16px above). */
  spacing?: "first" | "next" | "gap";
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  error: string;
  invalid: boolean;
  type?: string;
  inputMode?: "email" | "tel" | "text";
  autoComplete?: string;
  describedBy?: string;
  /** The email field animates its border; the others don't. */
  animated?: boolean;
  errorId?: string;
  errorLive?: boolean;
}

const LABEL_CLASS = {
  first: styles.label,
  next: styles.labelNext,
  gap: styles.labelGap,
};

export const TextField = ({
  id,
  label,
  spacing = "first",
  name,
  value,
  onChange,
  onBlur,
  onKeyDown,
  error,
  invalid,
  type,
  inputMode,
  autoComplete,
  describedBy,
  animated,
  errorId,
  errorLive,
  ref,
}: TextFieldProps) => (
  <>
    <label htmlFor={id} className={LABEL_CLASS[spacing]}>
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
      onKeyDown={onKeyDown}
      aria-invalid={invalid ? "true" : "false"}
      aria-describedby={describedBy}
      className={joinClassNames(
        animated ? styles.inputAnimated : styles.input,
        invalid ? styles.borderError : styles.border,
      )}
    />
    <div
      id={errorId}
      role="alert"
      aria-live={errorLive ? "polite" : undefined}
      className={styles.error}
    >
      {error}
    </div>
  </>
);

/** First / last name side by side. */
export const NameFields = ({
  idPrefix,
  first,
  last,
}: {
  idPrefix: string;
  first: Omit<TextFieldProps, "id" | "label">;
  last: Omit<TextFieldProps, "id" | "label">;
}) => (
  <div className={styles.nameRow}>
    <div className={styles.nameCell}>
      <TextField
        id={`${idPrefix}first`}
        label="First name"
        autoComplete="given-name"
        {...first}
      />
    </div>
    <div className={styles.nameCell}>
      <TextField
        id={`${idPrefix}last`}
        label="Last name"
        autoComplete="family-name"
        {...last}
      />
    </div>
  </div>
);

interface PasswordInputProps extends FieldBinding {
  id: string;
  shown: boolean;
  onToggle: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  autoComplete: string;
  invalid: boolean;
  describedBy: string;
  shake?: boolean;
  /** Log-in password animates its border. */
  animated?: boolean;
}

export const PasswordInput = ({
  id,
  name,
  value,
  shown,
  onToggle,
  onChange,
  onBlur,
  onKeyDown,
  autoComplete,
  invalid,
  describedBy,
  shake,
  animated,
  ref,
}: PasswordInputProps) => (
  <div className={joinClassNames(styles.passwordWrap, shake && styles.shake)}>
    <input
      id={id}
      type={shown ? "text" : "password"}
      autoComplete={autoComplete}
      ref={ref}
      name={name}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      aria-invalid={invalid ? "true" : "false"}
      aria-describedby={describedBy}
      className={joinClassNames(
        animated ? styles.passwordInputAnimated : styles.passwordInput,
        invalid ? styles.borderError : styles.border,
      )}
    />
    <button
      onClick={onToggle}
      aria-label={shown ? "Hide password" : "Show password"}
      className={styles.passwordToggle}
    >
      {shown ? "Hide" : "Show"}
    </button>
  </div>
);

interface MobileFieldProps extends FieldBinding {
  id: string;
  error: string;
  invalid: boolean;
}

export const MobileField = ({
  id,
  name,
  value,
  onChange,
  onBlur,
  error,
  invalid,
  ref,
}: MobileFieldProps) => (
  <>
    <label htmlFor={id} className={styles.labelGap}>
      Mobile
    </label>
    <div
      className={joinClassNames(
        styles.mobileWrap,
        invalid ? styles.borderError : styles.border,
      )}
    >
      <span className={styles.prefix}>+44</span>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        ref={ref}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        aria-invalid={invalid ? "true" : "false"}
        className={styles.mobileInput}
      />
    </div>
    <div role="alert" className={styles.error}>
      {error}
    </div>
  </>
);

interface ConsentProps {
  terms: boolean;
  marketing: boolean;
  termsError: string;
  onTerms: (event: ChangeEvent<HTMLInputElement>) => void;
  onMarketing: (event: ChangeEvent<HTMLInputElement>) => void;
  onOpenClient: () => void;
  onOpenPrivacy: () => void;
}

/** Client Terms + Privacy agreement and the marketing opt-in. */
export const ClientConsent = ({
  terms,
  marketing,
  termsError,
  onTerms,
  onMarketing,
  onOpenClient,
  onOpenPrivacy,
}: ConsentProps) => (
  <>
    <label className={styles.termsLabel}>
      <input
        type="checkbox"
        checked={terms}
        onChange={onTerms}
        aria-invalid={termsError ? "true" : "false"}
        className={styles.checkbox}
      />
      <span>
        I agree to the{" "}
        <button onClick={onOpenClient} className={styles.inlineLink}>
          Client Terms
        </button>{" "}
        and{" "}
        <button onClick={onOpenPrivacy} className={styles.inlineLink}>
          Privacy Policy
        </button>
      </span>
    </label>
    {!!termsError && (
      <div role="alert" className={styles.termsError}>
        {termsError}
      </div>
    )}
    <label className={styles.marketingLabel}>
      <input
        type="checkbox"
        checked={marketing}
        onChange={onMarketing}
        className={styles.checkbox}
      />
      <span>Send me offers and news from Tiwára’s House</span>
    </label>
  </>
);

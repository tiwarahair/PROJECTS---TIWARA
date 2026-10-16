// The pieces every account settings page is built from: sections, fields, disclosures, checkboxes and switches.
import type { ChangeEvent, ReactNode } from "react";
import { Check } from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import shared from "../../styles/components/account-settings/index.module.css";
import fields from "../../styles/components/account-settings/fields.module.css";

/** Section with the heading column on the left (wraps above on narrow containers). */
export const SettingsSection = ({
  label,
  heading,
  intro,
  className,
  children,
}: {
  label: string;
  heading: string;
  intro?: ReactNode;
  className?: string;
  children: ReactNode;
}) => (
  <section
    className={joinClassNames(shared.section, className)}
    data-screen-label={label}
  >
    <div className={shared.intro}>
      <h2 className={shared.heading}>{heading}</h2>
      {intro}
    </div>
    {children}
  </section>
);

export interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  error: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  className: string | undefined;
  type?: string;
  autoComplete?: string;
  showError?: boolean;
}

/** Label, input and error line. */
export const TextField = ({
  id,
  label,
  value,
  error,
  onChange,
  className,
  type,
  autoComplete,
  showError = true,
}: TextFieldProps) => (
  <div>
    <label className={shared.label} htmlFor={id}>
      {label}
    </label>
    <input
      className={joinClassNames(
        className,
        shared.focusRing,
        error ? shared.fieldErr : shared.fieldOk,
      )}
      data-ac-in="1"
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      autoComplete={autoComplete}
      aria-invalid={error ? "true" : "false"}
    />
    {showError && !!error && (
      <div className={shared.error} role="alert">
        {error}
      </div>
    )}
  </div>
);

export const Reveal = ({
  open,
  children,
}: {
  open: boolean;
  children: ReactNode;
}) => (
  <div
    className={joinClassNames(
      fields.reveal,
      open ? fields.revealOpen : fields.revealClosed,
    )}
    data-ac-anim="1"
    aria-hidden={open ? "false" : "true"}
  >
    <div className={fields.revealInner}>{children}</div>
  </div>
);

/** Checkbox row (role=checkbox buttons). */
export const CheckRow = ({
  isOn,
  onToggle,
  children,
}: {
  isOn: boolean;
  onToggle: () => void;
  children: ReactNode;
}) => (
  <button
    className={joinClassNames(shared.checkRow, shared.focusRing)}
    data-ac-in="1"
    role="checkbox"
    aria-checked={isOn ? "true" : "false"}
    onClick={onToggle}
  >
    <span
      className={joinClassNames(
        shared.checkBox,
        isOn ? shared.checkOn : shared.checkOff,
      )}
    >
      <Check
        className={joinClassNames(
          shared.checkTick,
          isOn ? shared.tickOn : shared.tickOff,
        )}
        size={14}
        color="#fffefb"
        strokeWidth={3}
      />
    </span>
    {children}
  </button>
);

export const Switch = ({
  isOn,
  label,
  onToggle,
  className,
}: {
  isOn: boolean;
  label: string;
  onToggle: () => void;
  className: string | undefined;
}) => (
  <button
    className={joinClassNames(className, shared.focusRing)}
    data-ac-in="1"
    role="switch"
    aria-checked={isOn ? "true" : "false"}
    aria-label={label}
    onClick={onToggle}
  >
    <span
      className={joinClassNames(
        shared.switchTrack,
        isOn ? shared.trackOn : shared.trackOff,
      )}
    >
      <span
        className={joinClassNames(
          shared.switchKnob,
          isOn ? shared.knobOn : shared.knobOff,
        )}
      ></span>
    </span>
  </button>
);

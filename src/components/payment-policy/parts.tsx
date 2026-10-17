import type { ReactNode } from "react";
import { ChevronDown, CircleAlert } from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import styles from "../../styles/components/payment-policy/parts.module.css";

export const ErrorLine = ({
  className,
  children,
}: {
  className: string | undefined;
  children: ReactNode;
}) => (
  <div className={className} role="alert">
    <CircleAlert className={styles.errorIcon} size={15} strokeWidth={1.8} />
    {children}
  </div>
);

/** Grid-rows disclosure. */
export const Reveal = ({
  open,
  children,
}: {
  open: boolean;
  children: ReactNode;
}) => (
  <div
    className={joinClassNames(
      styles.reveal,
      open ? styles.revealOpen : styles.revealClosed,
    )}
    data-pp-anim="1"
    aria-hidden={open ? "false" : "true"}
  >
    <div className={styles.revealInner}>{children}</div>
  </div>
);

/** Radio ring + dot. */
export const Ring = ({
  className,
  isOn,
}: {
  className: string | undefined;
  isOn: boolean;
}) => (
  <span
    className={joinClassNames(className, isOn ? styles.ringOn : styles.ringOff)}
  >
    <span
      className={joinClassNames(
        styles.dot,
        isOn ? styles.dotOn : styles.dotOff,
      )}
    ></span>
  </span>
);

/** Tile border + background. */
export const getTileClass = (isOn: boolean) =>
  isOn ? styles.tileOn : styles.tileOff;
export const getTextClass = (isOn: boolean) =>
  isOn ? styles.textOn : styles.textOff;

export const Select = ({
  id,
  value,
  options,
  onChange,
  wrapClassName,
}: {
  id: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  wrapClassName: string | undefined;
}) => (
  <span className={wrapClassName}>
    <select
      className={joinClassNames(styles.select, styles.focusRing)}
      data-pp-in="1"
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map(({ value: optionValue, label }) => (
        <option key={optionValue} value={optionValue}>
          {label}
        </option>
      ))}
    </select>
    <ChevronDown className={styles.selectChevron} size={16} strokeWidth={2} />
  </span>
);

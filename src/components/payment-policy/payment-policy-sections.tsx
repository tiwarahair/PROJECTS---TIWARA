import type { ChangeEvent, KeyboardEvent, ReactNode } from "react";
import type { PolicyMode } from "../../types/policy";
import { joinClassNames } from "../../utils/class-names";
import type { FeeState } from "./payment-policy-logic";
import styles from "./payment-policy.module.css";

export const MODES: {
  key: PolicyMode;
  title: string;
  description: string;
  isRecommended: boolean;
}[] = [
  {
    key: "deposit",
    title: "Deposit",
    description: "Clients pay part now, the rest to you at the appointment",
    isRecommended: true,
  },
  {
    key: "full",
    title: "Full payment",
    description: "Clients pay the full price when they book",
    isRecommended: false,
  },
  {
    key: "card",
    title: "Card protection",
    description:
      "Nothing upfront. Card saved to cover late cancellations and no-shows",
    isRecommended: false,
  },
  {
    key: "none",
    title: "No protection",
    description: "Nothing upfront. No card saved",
    isRecommended: false,
  },
];

export const ErrorLine = ({
  className,
  children,
}: {
  className: string | undefined;
  children: ReactNode;
}) => (
  <div className={className} role="alert">
    <svg
      className={styles.errorIcon}
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M12 7v6M12 16.5v.5"></path>
    </svg>
    {children}
  </div>
);

/** Grid-rows disclosure (prototype dis()). */
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

/** Radio ring + dot (prototype tile() ring / dot). */
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

/** Prototype tile() border + background. */
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
    <svg
      className={styles.selectChevron}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6"></path>
    </svg>
  </span>
);

interface FeeBlockProps {
  label: string;
  fee: FeeState;
  mode: PolicyMode;
  depositText: string;
  error: string;
  onUpdate: (patch: Partial<FeeState>) => void;
}

/** "Late cancellation fee" / "No-show fee": checkbox, then keep-the-deposit or a percentage. */
export const FeeBlock = ({
  label,
  fee,
  mode,
  depositText,
  error,
  onUpdate,
}: FeeBlockProps) => {
  const isKeep = fee.kind === "keep";

  const pickPercent = () => {
    if (fee.kind !== "pct") onUpdate({ kind: "pct" });
  };

  const percentInput = (withFocus: boolean) => (
    <span className={styles.pctFieldWrap}>
      <input
        className={joinClassNames(
          styles.pctInput,
          styles.focusRing,
          error ? styles.fieldErr : styles.fieldOk,
        )}
        data-pp-in="1"
        inputMode="numeric"
        aria-label={`${label} percentage of service`}
        value={fee.percent}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onUpdate({
            percent: event.target.value.replace(/\D/g, "").slice(0, 3),
            kind: "pct",
          })
        }
        onFocus={withFocus ? pickPercent : undefined}
        aria-invalid={error ? "true" : "false"}
      />
      <span className={styles.pctFieldSign}>%</span>
    </span>
  );

  return (
    <div>
      <button
        className={joinClassNames(styles.feeToggle, styles.focusRing)}
        data-pp-in="1"
        role="checkbox"
        aria-checked={fee.on ? "true" : "false"}
        onClick={() => onUpdate({ on: !fee.on })}
      >
        <span
          className={joinClassNames(
            styles.feeBox,
            fee.on ? styles.boxOn : styles.boxOff,
          )}
        >
          <svg
            className={joinClassNames(
              styles.feeTick,
              fee.on ? styles.tickOn : styles.tickOff,
            )}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fffefb"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12.5l4.5 4.5L19 7.5"></path>
          </svg>
        </span>
        <span className={styles.feeLabel}>{label}</span>
      </button>
      <Reveal open={fee.on}>
        <div className={styles.feeBody}>
          {mode === "deposit" && (
            <div
              className={styles.feeOptions}
              role="radiogroup"
              aria-label={label}
            >
              <button
                className={joinClassNames(
                  styles.option,
                  styles.focusRing,
                  getTileClass(isKeep),
                )}
                data-pp-in="1"
                role="radio"
                aria-checked={isKeep ? "true" : "false"}
                onClick={() => onUpdate({ kind: "keep" })}
              >
                <Ring className={styles.ring} isOn={isKeep} />
                <span
                  className={joinClassNames(
                    styles.keepLabel,
                    getTextClass(isKeep),
                  )}
                >
                  {`Keep the deposit (${depositText}%)`}
                </span>
              </button>
              {/* the prototype's radio is a focusable div because it contains the percentage input */}
              <div
                className={joinClassNames(
                  styles.pctOption,
                  styles.focusRing,
                  getTileClass(!isKeep),
                )}
                data-pp-in="1"
                role="radio"
                tabIndex={0}
                aria-checked={!isKeep ? "true" : "false"}
                onClick={pickPercent}
                onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
                  if (
                    event.target === event.currentTarget &&
                    (event.key === " " || event.key === "Enter")
                  ) {
                    event.preventDefault();
                    onUpdate({ kind: "pct" });
                  }
                }}
              >
                <Ring className={styles.ring} isOn={!isKeep} />
                <span
                  className={joinClassNames(
                    styles.strong,
                    getTextClass(!isKeep),
                  )}
                >
                  Charge
                </span>
                {percentInput(true)}
                <span className={styles.muted}>of service</span>
              </div>
            </div>
          )}
          {mode !== "deposit" && (
            <div className={styles.pctSingle}>
              <span className={styles.strong}>Charge</span>
              {percentInput(false)}
              <span className={styles.muted}>of service</span>
            </div>
          )}
          {!!error && (
            <ErrorLine className={styles.feeError}>{error}</ErrorLine>
          )}
        </div>
      </Reveal>
    </div>
  );
};

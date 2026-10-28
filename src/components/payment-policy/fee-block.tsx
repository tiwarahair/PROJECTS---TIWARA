import type { KeyboardEvent } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { Check } from "lucide-react";
import type { PolicyMode } from "../../types/policy";
import { joinClassNames } from "../../utils/class-names";
import { ErrorLine, Reveal, Ring, getTextClass, getTileClass } from "./parts";
import type { FeeValues } from "./types";
import styles from "../../styles/components/payment-policy/fee-block.module.css";
import parts from "../../styles/components/payment-policy/parts.module.css";

interface FeeBlockProps {
  label: string;
  fee: FeeValues;
  mode: PolicyMode;
  depositText: string;
  error: string;
  percentInput: UseFormRegisterReturn;
  onUpdate: (patch: Partial<FeeValues>) => void;
}

/** "Late cancellation fee" / "No-show fee": checkbox, then keep-the-deposit or a percentage. */
export const FeeBlock = ({
  label,
  fee,
  mode,
  depositText,
  error,
  percentInput: percentField,
  onUpdate,
}: FeeBlockProps) => {
  const isKeep = fee.kind === "keep";

  const pickPercent = () => {
    if (fee.kind !== "percent") onUpdate({ kind: "percent" });
  };

  const percentInput = (withFocus: boolean) => (
    <span className={styles.pctFieldWrap}>
      <input
        className={joinClassNames(
          styles.pctInput,
          parts.focusRing,
          error ? parts.fieldErr : parts.fieldOk,
        )}
        data-pp-in="1"
        inputMode="numeric"
        aria-label={`${label} percentage of service`}
        {...percentField}
        onFocus={withFocus ? pickPercent : undefined}
        aria-invalid={error ? "true" : "false"}
      />
      <span className={styles.pctFieldSign}>%</span>
    </span>
  );

  return (
    <div>
      <button
        className={joinClassNames(styles.feeToggle, parts.focusRing)}
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
          <Check
            className={joinClassNames(
              styles.feeTick,
              fee.on ? styles.tickOn : styles.tickOff,
            )}
            size={14}
            color="#fffefb"
            strokeWidth={3}
          />
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
                  parts.option,
                  parts.focusRing,
                  getTileClass(isKeep),
                )}
                data-pp-in="1"
                role="radio"
                aria-checked={isKeep ? "true" : "false"}
                onClick={() => onUpdate({ kind: "keep" })}
              >
                <Ring className={parts.ring} isOn={isKeep} />
                <span
                  className={joinClassNames(
                    styles.keepLabel,
                    getTextClass(isKeep),
                  )}
                >
                  {`Keep the deposit (${depositText}%)`}
                </span>
              </button>
              {/* the radio is a focusable div because it contains the percentage input */}
              <div
                className={joinClassNames(
                  styles.pctOption,
                  parts.focusRing,
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
                    onUpdate({ kind: "percent" });
                  }
                }}
              >
                <Ring className={parts.ring} isOn={!isKeep} />
                <span
                  className={joinClassNames(
                    parts.strong,
                    getTextClass(!isKeep),
                  )}
                >
                  Charge
                </span>
                {percentInput(true)}
                <span className={parts.muted}>of service</span>
              </div>
            </div>
          )}
          {mode !== "deposit" && (
            <div className={styles.pctSingle}>
              <span className={parts.strong}>Charge</span>
              {percentInput(false)}
              <span className={parts.muted}>of service</span>
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

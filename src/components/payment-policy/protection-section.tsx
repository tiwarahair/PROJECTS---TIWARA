import { Info } from "lucide-react";
import type { PolicyMode } from "../../types/policy";
import { joinClassNames } from "../../utils/class-names";
import { ErrorLine, Reveal, Ring, getTextClass, getTileClass } from "./parts";
import type { PaymentPolicyController } from "./use-payment-policy";
import styles from "../../styles/components/payment-policy/protection-section.module.css";
import parts from "../../styles/components/payment-policy/parts.module.css";

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

export const ProtectionSection = ({
  policy: {
    uid,
    policy: { mode, refundable },
    depositInput,
    getError,
    setMode,
    setRefundable,
  },
}: {
  policy: PaymentPolicyController;
}) => {
  const depositError = getError("deposit");

  return (
    <section data-screen-label="Booking protection">
      <h2 className={parts.heading}>Booking protection</h2>
      <p className={parts.intro}>
        Choose what clients pay or provide when they book.
      </p>
      <div
        className={styles.modes}
        role="radiogroup"
        aria-label="Booking protection"
      >
        {MODES.map(({ key, title, description, isRecommended }) => {
          const isOn = mode === key;

          return (
            <button
              key={key}
              className={joinClassNames(
                styles.modeTile,
                parts.focusRing,
                getTileClass(isOn),
              )}
              data-pp-in="1"
              role="radio"
              aria-checked={isOn ? "true" : "false"}
              onClick={() => setMode(key)}
            >
              <Ring className={styles.modeRing} isOn={isOn} />
              <span className={styles.modeText}>
                <span className={styles.modeHead}>
                  <span
                    className={joinClassNames(
                      styles.modeTitle,
                      getTextClass(isOn),
                    )}
                  >
                    {title}
                  </span>
                  {isRecommended && (
                    <span className={styles.tag}>Recommended</span>
                  )}
                </span>
                <span className={styles.modeDesc}>{description}</span>
              </span>
            </button>
          );
        })}
      </div>

      <Reveal open={mode === "deposit"}>
        <div className={styles.depositStack}>
          <div>
            <label className={parts.label} htmlFor={`${uid}-dep`}>
              Deposit amount
            </label>
            <div className={styles.pctWrap}>
              <input
                className={joinClassNames(
                  styles.depositInput,
                  parts.focusRing,
                  depositError ? parts.fieldErr : parts.fieldOk,
                )}
                data-pp-in="1"
                id={`${uid}-dep`}
                inputMode="numeric"
                {...depositInput}
                aria-invalid={depositError ? "true" : "false"}
              />
              <span className={styles.pctSign}>%</span>
            </div>
            {!!depositError && (
              <ErrorLine className={styles.error}>{depositError}</ErrorLine>
            )}
          </div>
          <div>
            <div className={parts.strong} id={`${uid}-ref`}>
              Deposit refund
            </div>
            <div
              className={styles.options}
              role="radiogroup"
              aria-labelledby={`${uid}-ref`}
            >
              {(
                [
                  [true, "Refundable according to cancellation policy"],
                  [false, "Non-refundable"],
                ] as const
              ).map(([isRefundable, label]) => {
                const isOn = refundable === isRefundable;

                return (
                  <button
                    key={label}
                    className={joinClassNames(
                      parts.option,
                      parts.focusRing,
                      getTileClass(isOn),
                    )}
                    data-pp-in="1"
                    role="radio"
                    aria-checked={isOn ? "true" : "false"}
                    onClick={() => setRefundable(isRefundable)}
                  >
                    <Ring className={parts.ring} isOn={isOn} />
                    <span
                      className={joinClassNames(
                        styles.optionLabel,
                        getTextClass(isOn),
                      )}
                    >
                      {label}
                    </span>
                    {isRefundable && (
                      <span className={styles.tag}>Recommended</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal open={mode === "none"}>
        <div className={styles.note} role="note">
          <Info className={styles.noteIcon} size={18} strokeWidth={1.7} />
          <span>
            You won’t be able to charge fees for late cancellations or no-shows.
          </span>
        </div>
      </Reveal>
    </section>
  );
};

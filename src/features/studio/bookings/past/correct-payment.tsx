import { useId } from "react";
import { joinClassNames } from "../../../../utils/class-names";
import { CORRECT_VIAS } from "./view/correct";
import type { PastSheetView } from "./view";
import styles from "../../../../styles/features/studio/bookings/past/correct-payment.module.css";

/** Fixing a recorded payment's amount, tip or method. */
export const CorrectPayment = ({ view }: { view: PastSheetView }) => {
  const uid = useId();
  const draft = view.correctDraft;

  if (!draft) return null;

  return (
    <div className={styles.panel}>
      <div className={styles.title}>Correct payment</div>
      <div className={styles.fields}>
        <label className={styles.field} htmlFor={`${uid}-amount`}>
          <span className={styles.label}>Amount received</span>
          <span className={styles.money}>
            <span className={styles.pound}>£</span>
            <input
              id={`${uid}-amount`}
              className={styles.input}
              inputMode="decimal"
              value={draft.amount}
              onChange={(event) =>
                view.patchCorrect({
                  amount: event.target.value.replace(/[^0-9.]/g, ""),
                })
              }
            />
          </span>
        </label>
        <label className={styles.field} htmlFor={`${uid}-tip`}>
          <span className={styles.label}>Of which tip</span>
          <span className={styles.money}>
            <span className={styles.pound}>£</span>
            <input
              id={`${uid}-tip`}
              className={styles.input}
              inputMode="decimal"
              value={draft.tip}
              onChange={(event) =>
                view.patchCorrect({
                  tip: event.target.value.replace(/[^0-9.]/g, ""),
                })
              }
            />
          </span>
        </label>
      </div>
      <div className={styles.chips} role="radiogroup" aria-label="Paid by">
        {CORRECT_VIAS.map(([via, label]) => (
          <button
            key={via}
            className={joinClassNames(
              styles.chip,
              draft.via === via && styles.chipOn,
            )}
            role="radio"
            aria-checked={draft.via === via ? "true" : "false"}
            onClick={() => view.patchCorrect({ via })}
          >
            {label}
          </button>
        ))}
      </div>
      {!view.isCorrectValid && (
        <div className={styles.error} role="alert">
          Enter the amount received. The tip can’t be more than the amount.
        </div>
      )}
      <div className={styles.buttons}>
        <button className={styles.cancel} onClick={view.cancelCorrect}>
          Cancel
        </button>
        <button
          className={styles.save}
          onClick={view.saveCorrect}
          disabled={!view.isCorrectValid}
        >
          Save
        </button>
      </div>
    </div>
  );
};

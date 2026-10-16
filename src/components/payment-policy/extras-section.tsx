import { Plus, X } from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import { EXTRAS_LIMIT } from "./summary";
import type { PaymentPolicyController } from "./use-payment-policy";
import styles from "../../styles/components/payment-policy/extras-section.module.css";
import parts from "../../styles/components/payment-policy/parts.module.css";

export const ExtrasSection = ({
  policy: { uid, fields, used, isFull, getExtraInput, addExtra, removeExtra },
}: {
  policy: PaymentPolicyController;
}) => (
  <section data-screen-label="Additional policies">
    <h2 className={parts.heading}>
      Additional policies <span className={styles.optional}>(optional)</span>
    </h2>
    <p className={parts.intro}>
      Your settings above always take priority over anything written here.
    </p>
    {fields.length > 0 && (
      <div className={styles.extras}>
        {fields.map(({ id, type }, index) => {
          const fieldId = `${uid}-x${id}`;
          const isPreparation = type === "prep";

          const extraName = isPreparation
            ? "preparation note"
            : "custom policy";

          return (
            <div key={id}>
              <div className={styles.extraHead}>
                <label className={parts.strong} htmlFor={fieldId}>
                  {isPreparation ? "Preparation note" : "Custom policy"}
                </label>
                <button
                  className={joinClassNames(
                    styles.removeExtra,
                    parts.focusRing,
                  )}
                  data-pp-in="1"
                  aria-label={`Remove ${extraName}`}
                  onClick={() => removeExtra(index)}
                >
                  <X
                    className={styles.removeIcon}
                    size={16}
                    strokeWidth={1.7}
                  />
                </button>
              </div>
              <textarea
                className={joinClassNames(styles.extraText, parts.focusRing)}
                data-pp-in="1"
                id={fieldId}
                rows={3}
                placeholder={
                  isPreparation
                    ? "e.g. Please arrive with clean, product-free hair"
                    : "e.g. Please don’t bring extra guests to your appointment"
                }
                {...getExtraInput(index)}
              ></textarea>
            </div>
          );
        })}
        <div
          className={joinClassNames(
            styles.count,
            isFull ? styles.countFull : styles.countOpen,
          )}
          aria-live="polite"
        >
          {isFull
            ? `Limit reached, ${used} / ${EXTRAS_LIMIT}`
            : `${used} / ${EXTRAS_LIMIT}`}
        </div>
      </div>
    )}
    <div className={styles.addRow}>
      {(
        [
          ["prep", "Add preparation note"],
          ["custom", "Add custom policy"],
        ] as const
      ).map(([type, label]) => (
        <button
          key={type}
          className={joinClassNames(
            styles.addButton,
            parts.focusRing,
            isFull ? styles.addFull : styles.addOpen,
          )}
          data-pp-in="1"
          disabled={isFull}
          onClick={() => addExtra(type)}
        >
          <Plus size={16} strokeWidth={1.7} />
          {label}
        </button>
      ))}
    </div>
  </section>
);

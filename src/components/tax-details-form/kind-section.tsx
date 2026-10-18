import { joinClassNames } from "../../utils/class-names";
import { KINDS } from "./field";
import type { TaxDetailsController } from "./use-tax-details";
import styles from "../../styles/components/tax-details-form/kind-section.module.css";
import shared from "../../styles/components/tax-details-form/index.module.css";

interface KindSectionProps {
  tax: TaxDetailsController;
}

export const KindSection = ({
  tax: {
    kind,
    form: { setValue, clearErrors },
  },
}: KindSectionProps) => (
  <fieldset className={shared.fieldset}>
    <legend className={styles.legend}>How is your business set up?</legend>
    <div className={styles.kinds} role="radiogroup">
      {KINDS.map(([tileKind, label]) => {
        const isOn = kind === tileKind;

        return (
          <button
            key={tileKind}
            className={joinClassNames(
              styles.tile,
              isOn ? styles.tileOn : styles.tileOff,
            )}
            role="radio"
            aria-checked={isOn ? "true" : "false"}
            onClick={() => {
              setValue("kind", tileKind, { shouldDirty: true });
              clearErrors();
            }}
          >
            <span
              className={joinClassNames(
                styles.tileLabel,
                isOn ? styles.tileLabelOn : styles.tileLabelOff,
              )}
            >
              {label}
            </span>
            <span
              className={joinClassNames(
                styles.ring,
                isOn ? styles.ringOn : styles.ringOff,
              )}
              aria-hidden="true"
            >
              <span
                className={joinClassNames(
                  styles.dot,
                  isOn ? styles.dotOn : styles.dotOff,
                )}
              ></span>
            </span>
          </button>
        );
      })}
    </div>
  </fieldset>
);

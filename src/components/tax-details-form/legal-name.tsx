import { joinClassNames } from "../../utils/class-names";
import { Field } from "./field";
import type { TaxDetailsController } from "./use-tax-details";
import styles from "../../styles/components/tax-details-form/legal-name.module.css";

const ANSWERS = [
  ["yes", "Yes", true],
  ["no", "No", false],
] as const;

interface LegalNameProps {
  tax: TaxDetailsController;
}

export const LegalName = ({
  tax: {
    legalName,
    nameYes,
    getError,
    fieldId,
    form: { register, setValue, clearErrors },
  },
}: LegalNameProps) => (
  <div>
    <div className={styles.question} id={fieldId("nq")}>
      {`Is ${legalName || "this"} your legal name?`}
    </div>
    <div
      className={styles.chips}
      role="radiogroup"
      aria-labelledby={fieldId("nq")}
    >
      {ANSWERS.map(([key, label, isYes]) => {
        const isOn = nameYes === isYes;

        return (
          <button
            key={key}
            className={joinClassNames(
              styles.chip,
              isOn ? styles.chipOn : styles.chipOff,
            )}
            role="radio"
            aria-checked={isOn ? "true" : "false"}
            onClick={() => {
              setValue("nameYes", isYes, { shouldDirty: true });

              if (isYes) clearErrors(["first", "last"]);
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
    {!nameYes && (
      <div className={styles.nameFields} data-tx-anim="1">
        <div className={styles.hint}>
          As it appears on your passport or driving licence.
        </div>
        <Field
          id={fieldId("first")}
          label="Legal first name"
          error={getError("first")}
          inputProps={register("first")}
          autoComplete="given-name"
        />
        <Field
          id={fieldId("middle")}
          label="Middle name(s)"
          error=""
          inputProps={register("middle")}
          autoComplete="additional-name"
          optional={true}
        />
        <Field
          id={fieldId("last")}
          label="Legal last name"
          error={getError("last")}
          inputProps={register("last")}
          autoComplete="family-name"
        />
        <div className={styles.hint}>
          Changing it here doesn’t change your account name.
        </div>
      </div>
    )}
  </div>
);

import { Controller } from "react-hook-form";
import { Eye, EyeOff } from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import { formatNationalInsuranceNumber } from "./logic";
import type { TaxDetailsController } from "./use-tax-details";
import styles from "../../styles/components/tax-details-form/national-insurance.module.css";
import shared from "../../styles/components/tax-details-form/index.module.css";

interface NationalInsuranceProps {
  tax: TaxDetailsController;
}

export const NationalInsurance = ({
  tax: {
    initial: { nationalInsuranceHint },
    getError,
    fieldId,
    showNationalInsurance,
    toggleNationalInsurance,
    form: { control },
  },
}: NationalInsuranceProps) => {
  const nationalInsuranceError = getError("nationalInsuranceNumber");

  return (
    <div>
      <label className={shared.labelTight} htmlFor={fieldId("ni")}>
        National Insurance number
      </label>
      <div className={shared.help}>
        {nationalInsuranceHint
          ? `Saved: ${nationalInsuranceHint}. Leave blank to keep it.`
          : "Used for tax reporting. It looks like QQ 12 34 56 C."}
      </div>
      <div className={styles.niWrap}>
        <Controller
          name="nationalInsuranceNumber"
          control={control}
          render={({ field }) => (
            <input
              {...field}
              className={joinClassNames(
                shared.niInput,
                nationalInsuranceError ? shared.fieldErr : shared.fieldOk,
              )}
              id={fieldId("ni")}
              type={showNationalInsurance ? "text" : "password"}
              onChange={(event) =>
                field.onChange(
                  formatNationalInsuranceNumber(event.target.value),
                )
              }
              autoComplete="off"
              spellCheck="false"
              placeholder={nationalInsuranceHint || "QQ 12 34 56 C"}
              aria-invalid={nationalInsuranceError ? "true" : "false"}
              aria-describedby={fieldId("ni-e")}
            />
          )}
        />
        <button
          className={styles.niToggle}
          onClick={toggleNationalInsurance}
          aria-label={
            showNationalInsurance
              ? "Hide National Insurance number"
              : "Show National Insurance number"
          }
          aria-pressed={showNationalInsurance}
        >
          {!showNationalInsurance && <Eye size={18} strokeWidth={1.7} />}
          {showNationalInsurance && <EyeOff size={18} strokeWidth={1.7} />}
        </button>
      </div>
      {!!nationalInsuranceError && (
        <div className={shared.error} role="alert" id={fieldId("ni-e")}>
          {nationalInsuranceError}
        </div>
      )}
    </div>
  );
};

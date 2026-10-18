import { Controller } from "react-hook-form";
import { joinClassNames } from "../../utils/class-names";
import { DOB_PARTS } from "./field";
import type { TaxDetailsController } from "./use-tax-details";
import styles from "../../styles/components/tax-details-form/date-of-birth.module.css";
import shared from "../../styles/components/tax-details-form/index.module.css";

interface DateOfBirthProps {
  tax: TaxDetailsController;
}

export const DateOfBirth = ({
  tax: {
    getError,
    fieldId,
    dobRefs,
    form: { control, trigger, getFieldState },
  },
}: DateOfBirthProps) => {
  const dobError = getError("day");

  return (
    <fieldset className={shared.fieldset} aria-describedby={fieldId("dob-e")}>
      <legend className={styles.dobLegend}>Date of birth</legend>
      <div className={styles.dobRow}>
        {DOB_PARTS.map(
          ({ key, placeholder, aria, max, autoComplete }, index) => (
            <Controller
              key={key}
              name={key}
              control={control}
              rules={key === "day" ? undefined : { deps: ["day"] }}
              render={({ field }) => (
                <input
                  className={joinClassNames(
                    shared.dobInput,
                    max === 4 ? shared.dobLong : shared.dobShort,
                    dobError ? shared.fieldErr : shared.fieldOk,
                  )}
                  name={field.name}
                  ref={(element) => {
                    field.ref(element);
                    dobRefs.current[index] = element;
                  }}
                  value={field.value}
                  onChange={(event) => {
                    const digits = event.target.value
                      .replace(/\D/g, "")
                      .slice(0, max);

                    field.onChange(digits);

                    if (getFieldState("day").error) void trigger("day");

                    if (digits.length === max && index < 2)
                      dobRefs.current[index + 1]?.focus();
                  }}
                  onBlur={field.onBlur}
                  inputMode="numeric"
                  autoComplete={autoComplete}
                  maxLength={max}
                  placeholder={placeholder}
                  aria-label={aria}
                  aria-invalid={dobError ? "true" : "false"}
                />
              )}
            />
          ),
        )}
      </div>
      {!!dobError && (
        <div className={shared.error} role="alert" id={fieldId("dob-e")}>
          {dobError}
        </div>
      )}
    </fieldset>
  );
};

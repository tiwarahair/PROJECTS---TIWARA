import { Controller } from "react-hook-form";
import { Field } from "./field";
import type { TaxDetailsController } from "./use-tax-details";
import shared from "../../styles/components/tax-details-form/index.module.css";

interface CompanySectionProps {
  tax: TaxDetailsController;
}

export const CompanySection = ({
  tax: {
    getError,
    fieldId,
    form: { register, control },
  },
}: CompanySectionProps) => (
  <div className={shared.group}>
    <Field
      id={fieldId("coName")}
      label="Company name"
      error={getError("companyName")}
      inputProps={register("companyName")}
      help="As registered at Companies House."
      placeholder=""
    />
    <Controller
      name="companyNumber"
      control={control}
      render={({ field }) => (
        <Field
          id={fieldId("coNum")}
          label="Company registration number"
          error={getError("companyNumber")}
          inputProps={{
            ...field,
            onChange: (event) =>
              field.onChange(
                event.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, "")
                  .slice(0, 8),
              ),
          }}
          help="8 characters, like 12345678 or SC123456."
          placeholder="12345678"
          isCode={true}
        />
      )}
    />
  </div>
);

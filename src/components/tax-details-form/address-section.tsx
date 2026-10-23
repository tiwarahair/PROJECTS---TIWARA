import { Controller } from "react-hook-form";
import { AddressFinder } from "../address-finder";
import { getBlankAddress } from "./logic";
import type { TaxDetailsController } from "./use-tax-details";
import styles from "../../styles/components/tax-details-form/address-section.module.css";

interface AddressSectionProps {
  tax: TaxDetailsController;
}

export const AddressSection = ({
  tax: {
    isSole,
    showSame,
    isSame,
    sameText,
    addressKey,
    fieldId,
    addressSource,
    errors,
    form: { register, control, setValue },
  },
}: AddressSectionProps) => (
  <div>
    <div className={styles.sectionTitle}>
      {isSole ? "Home address" : "Registered office address"}
    </div>
    <div className={styles.sectionHelp}>
      {isSole
        ? "Where you live, not where you work."
        : "The address registered at Companies House."}
    </div>
    {showSame && (
      <>
        <label className={styles.sameLabel}>
          <input
            className={styles.checkbox}
            type="checkbox"
            {...register(`${addressKey}.same`, {
              deps: [`${addressKey}.fields`],
            })}
          />
          <span>Same as my business address</span>
        </label>
        {isSame && <div className={styles.sameText}>{sameText}</div>}
      </>
    )}
    {!isSame && (
      <div className={styles.finder}>
        {/* host block for the embedded address finder */}
        <div data-dc-host="">
          <Controller
            key={addressKey}
            name={`${addressKey}.fields`}
            control={control}
            render={({ field }) => (
              <AddressFinder
                idPrefix={fieldId(addressKey)}
                label="Address or postcode"
                value={
                  field.value.line1
                    ? {
                        line1: field.value.line1,
                        line2: field.value.line2,
                        town: field.value.city,
                        postcode: field.value.postcode,
                        source: addressSource || "pick",
                      }
                    : null
                }
                onChange={(picked) => {
                  setValue(`${addressKey}.src`, picked ? picked.source : "");

                  field.onChange(
                    picked
                      ? {
                          line1: picked.line1,
                          line2: picked.line2 || "",
                          city: picked.town,
                          postcode: picked.postcode,
                        }
                      : getBlankAddress(),
                  );
                }}
                showErrors={!!errors[addressKey]?.fields}
                fieldHeight={50}
                labelSize={13.5}
              />
            )}
          />
        </div>
      </div>
    )}
  </div>
);

import { Lock } from "lucide-react";
import { AddressSection } from "./address-section";
import { CompanySection } from "./company-section";
import { DateOfBirth } from "./date-of-birth";
import { KindSection } from "./kind-section";
import { LegalName } from "./legal-name";
import { NationalInsurance } from "./national-insurance";
import type { TaxDetailsFormProps } from "./types";
import { useTaxDetails } from "./use-tax-details";
import styles from "../../styles/components/tax-details-form/index.module.css";

export type { TaxDetailsFormProps } from "./types";

/**
 * Legal and tax details before Stripe payouts (embedded in Studio):
 * sole trader (legal name, date of birth, home address, NI number) or limited company (name, number,
 * registered office).
 */
export const TaxDetailsForm = (props: TaxDetailsFormProps) => {
  const { onCancel } = props;
  const tax = useTaxDetails(props);
  const { isSole, isSettings, isSubmitting, save } = tax;

  return (
    <div className={styles.form} data-screen-label="Tax details form">
      <KindSection tax={tax} />

      {isSole && (
        <div className={styles.group}>
          <LegalName tax={tax} />
          <DateOfBirth tax={tax} />
        </div>
      )}

      {!isSole && <CompanySection tax={tax} />}

      <AddressSection tax={tax} />

      {isSole && <NationalInsurance tax={tax} />}

      <div className={styles.note}>
        <Lock className={styles.noteIcon} size={16} strokeWidth={1.6} />
        <span>Stored securely and only shared with HMRC.</span>
      </div>

      <div className={styles.actions}>
        {isSettings && (
          <button className={styles.cancel} onClick={() => onCancel?.()}>
            Cancel
          </button>
        )}
        <button
          className={styles.submit}
          onClick={save}
          disabled={isSubmitting}
        >
          {isSettings ? "Save" : "Continue to Stripe"}
        </button>
      </div>
    </div>
  );
};

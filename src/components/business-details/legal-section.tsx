import { ChevronRight } from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import { getLegalRows } from "./display";
import { Section } from "./parts";
import type { BusinessDetailsProps } from "./types";
import styles from "../../styles/components/business-details/legal-section.module.css";
import parts from "../../styles/components/business-details/parts.module.css";

export const LegalSection = ({
  tax,
  onEditTax,
}: Pick<BusinessDetailsProps, "tax" | "onEditTax">) => {
  const legalRows = getLegalRows(tax);
  const hasLegal = tax !== null;

  return (
    <Section
      id="legal"
      label="Legal details"
      heading="Legal details"
      intro="From your tax details. Used for payouts."
    >
      <div className={styles.legalCard}>
        {hasLegal && (
          <dl className={styles.legalList}>
            {legalRows.map(({ label, value: rowValue }, index) => (
              <div
                key={`l${index}`}
                className={joinClassNames(
                  styles.legalRow,
                  index ? styles.legalRowNext : styles.legalRowFirst,
                )}
              >
                <dt className={styles.legalKey}>{label}</dt>
                <dd className={styles.legalValue}>{rowValue}</dd>
              </div>
            ))}
          </dl>
        )}
        {!hasLegal && (
          <p className={styles.legalNone}>
            Add your tax details to get paid. Your legal details will appear
            here.
          </p>
        )}
        <button
          className={joinClassNames(styles.legalLink, parts.focusRing)}
          data-bd-in="1"
          onClick={() => onEditTax?.()}
        >
          {hasLegal ? "Edit in Tax details" : "Add tax details"}
          <ChevronRight size={15} strokeWidth={1.8} />
        </button>
      </div>
    </Section>
  );
};

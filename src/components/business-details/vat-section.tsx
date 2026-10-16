import { Check, CircleAlert } from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import { formatVatNumber } from "./display";
import { Reveal, Section } from "./parts";
import { getVatError } from "./schema";
import type { BusinessDetailsController } from "./use-business-details";
import styles from "../../styles/components/business-details/vat-section.module.css";
import parts from "../../styles/components/business-details/parts.module.css";

export const VatSection = ({
  business: { uid, vatOn, vat, vatInput, toggleVat, getError },
}: {
  business: BusinessDetailsController;
}) => {
  const vatError = getError("vat");

  return (
    <Section id="vat" label="VAT" heading="VAT">
      <div className={parts.card}>
        <button
          className={joinClassNames(styles.vatToggle, parts.focusRing)}
          data-bd-in="1"
          role="checkbox"
          aria-checked={vatOn ? "true" : "false"}
          onClick={toggleVat}
        >
          <span
            className={joinClassNames(
              styles.vatBox,
              vatOn ? styles.vatBoxOn : styles.vatBoxOff,
            )}
          >
            <Check
              className={joinClassNames(
                styles.vatTick,
                vatOn ? styles.vatTickOn : styles.vatTickOff,
              )}
              size={14}
              strokeWidth={3}
              color="#fffefb"
            />
          </span>
          <span className={parts.areaText}>I’m VAT registered</span>
        </button>
        <Reveal open={!vatOn}>
          <div className={styles.vatNote}>
            Most independent stylists aren’t VAT registered. You only need this
            if you’ve registered with HMRC.
          </div>
        </Reveal>
        <Reveal open={vatOn}>
          <div className={styles.vatField}>
            <label className={parts.label} htmlFor={`${uid}-vat`}>
              VAT number
            </label>
            <span className={styles.vatWrap}>
              <span className={styles.vatPrefix} aria-hidden="true">
                GB
              </span>
              <input
                className={joinClassNames(
                  styles.vatInput,
                  parts.focusRing,
                  vatError ? parts.fieldErr : parts.fieldOk,
                )}
                data-bd-in="1"
                id={`${uid}-vat`}
                inputMode="numeric"
                autoComplete="off"
                {...vatInput}
                aria-invalid={vatError ? "true" : "false"}
                aria-describedby={`${uid}-vath`}
              />
            </span>
            {!!vatError && (
              <div className={parts.error} role="alert">
                <CircleAlert
                  className={parts.errorIcon}
                  size={15}
                  strokeWidth={1.5}
                />
                {vatError}
              </div>
            )}
            {vatOn && !getVatError(vatOn, vat) && (
              <div className={styles.vatOk}>
                <Check size={15} strokeWidth={2} />
                {formatVatNumber(vat.replace(/\s+/g, ""))}
              </div>
            )}
            <div className={styles.vatHelp} id={`${uid}-vath`}>
              Shown on your clients’ receipts and your payout statements.
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
};

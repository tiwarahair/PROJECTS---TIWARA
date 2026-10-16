import { ChevronLeft, Check, CircleAlert } from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import { ContactSection } from "./contact-section";
import { LegalSection } from "./legal-section";
import { LocationSection } from "./location-section";
import { TypeSection } from "./type-section";
import type { BusinessDetailsProps } from "./types";
import { useBusinessDetails } from "./use-business-details";
import { VatSection } from "./vat-section";
import styles from "../../styles/components/business-details/index.module.css";
import parts from "../../styles/components/business-details/parts.module.css";

export type { BusinessDetailsApi, BusinessDetailsProps } from "./types";

/**
 * Studio → Settings → Business details: business type, location (address,
 * home-area preview or mobile base + radius), contact, VAT, legal details and a save bar.
 */
export const BusinessDetails = (props: BusinessDetailsProps) => {
  const { embedded = false, hideSave = false, tax, onEditTax } = props;
  const business = useBusinessDetails(props);
  const { scrollRef, isDirty, isToastShown, errorCount, save } = business;

  return (
    <div
      className={styles.root}
      data-bd-emb={embedded ? "1" : "0"}
      data-bd-hidesave={hideSave ? "1" : "0"}
      data-screen-label="Business details"
    >
      <div className={styles.scroll} ref={scrollRef} data-bd-scroll="1">
        <div className={styles.pad} data-bd-pad="1">
          {!embedded && (
            <>
              <button
                className={joinClassNames(styles.back, parts.focusRing)}
                data-bd-in="1"
              >
                <ChevronLeft size={20} strokeWidth={2} />
                Settings
              </button>
              <h1 className={styles.title}>Business details</h1>
            </>
          )}

          <div
            className={joinClassNames(
              styles.body,
              embedded ? styles.bodyEmbedded : styles.bodyStandalone,
            )}
          >
            <TypeSection business={business} />
            <LocationSection business={business} />
            <ContactSection business={business} />
            <VatSection business={business} />
            <LegalSection tax={tax} onEditTax={onEditTax} />
          </div>
        </div>
      </div>

      <div
        className={styles.saveBar}
        data-bd-bar="1"
        data-screen-label="Save bar"
      >
        <div
          className={joinClassNames(
            styles.toast,
            isToastShown ? styles.toastShown : styles.toastHidden,
          )}
          data-bd-toast="1"
          role="status"
          aria-live="polite"
        >
          <Check size={16} strokeWidth={2} />
          Business details saved
        </div>
        <div className={styles.barInner} data-bd-barin="1">
          {errorCount > 0 && (
            <div className={styles.barError}>
              <CircleAlert
                className={styles.barErrorIcon}
                size={15}
                strokeWidth={1.5}
              />
              {errorCount === 1
                ? "Fix the highlighted field to save"
                : `Fix the ${errorCount} highlighted fields to save`}
            </div>
          )}
          <button
            className={joinClassNames(
              styles.saveButton,
              parts.focusRing,
              isDirty ? styles.saveDirty : styles.saveClean,
            )}
            data-bd-in="1"
            data-bd-savebtn="1"
            disabled={!isDirty}
            onClick={save}
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
};

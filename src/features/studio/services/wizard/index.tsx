import { joinClassNames } from "../../../../utils/class-names";
import { AddonsStep } from "./addons-step";
import { DetailsStep } from "./details-step";
import { PricingStep } from "./pricing-step";
import { ReviewStep } from "./review-step";
import type { WizardForm } from "./use-wizard-form";
import type { WizardView } from "./view";
import styles from "../../../../styles/features/studio/services/wizard/index.module.css";

interface WizardProps {
  view: WizardView;
  form: WizardForm;
}

/** The service wizard's body. */
export const WizardSheet = ({ view, form }: WizardProps) => (
  <>
    {view.isAdd && (
      <>
        <div className={styles.dots}>
          {view.dots.map(({ key, isOn }) => (
            <span
              key={key}
              className={joinClassNames(styles.dot, isOn && styles.dotOn)}
            ></span>
          ))}
        </div>
        <div className={styles.stepLabel}>
          {view.stepLabel}
          <span className={styles.stepName}>{view.stepName}</span>
        </div>
      </>
    )}
    {view.isEdit && (
      <div className={styles.tabs}>
        {view.tabs.map(({ key, label, isOn, pick }) => (
          <button
            key={key}
            className={joinClassNames(styles.tab, isOn && styles.tabOn)}
            onClick={pick}
          >
            {label}
          </button>
        ))}
      </div>
    )}
    {view.isStep2 && <DetailsStep view={view} form={form} />}
    {view.isPricing && <PricingStep view={view} form={form} />}
    {view.isReview && <ReviewStep view={view} />}
    {view.isStep4 && <AddonsStep view={view} />}
  </>
);

/** Back / Continue / Add service / Save service. */
export const WizardFooter = ({ view, form }: WizardProps) => (
  <div className={styles.footer}>
    <div className={styles.footerRow}>
      {view.canBack && (
        <button className={styles.back} onClick={view.back}>
          Back
        </button>
      )}
      <button
        className={joinClassNames(
          styles.next,
          view.isDisabled && styles.nextOff,
        )}
        onClick={() =>
          void form.handleSubmit(view.next, (errors) => {
            if (!view.isEdit) return;

            view.showStep(errors.name || errors.typeId ? 2 : 3);
          })()
        }
        disabled={view.isDisabled}
      >
        {view.cta}
      </button>
    </div>
  </div>
);

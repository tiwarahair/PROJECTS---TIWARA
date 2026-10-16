import { Check, ChevronLeft, X } from "lucide-react";
import { TaxDetailsForm } from "../../../../components/tax-details-form/tax-details-form";
import { joinClassNames } from "../../../../utils/class-names";
import { getOverlayAnimation } from "../../shell/overlay";
import type { StudioController } from "../../core/use-studio";
import { StepApp } from "./step-app";
import { StepBackup } from "./step-backup";
import { StepLearn } from "./step-learn";
import { StepMethod } from "./step-method";
import { StepSecure } from "./step-secure";
import { BusyButton, CodeField } from "./fields";
import { useTwoFactorForm } from "./use-two-factor-form";
import { getTwoFactorView } from "./view";
import type { TwoFactorView } from "./view";
import overlay from "../../../../styles/features/studio/shell/overlay.module.css";
import styles from "../../../../styles/features/studio/settings/two-factor/index.module.css";

interface TwoFactorBodyProps {
  studio: StudioController;
  view: TwoFactorView;
}

const TwoFactorBody = ({ studio, view }: TwoFactorBodyProps) => {
  const { state } = studio;

  return (
    <>
      {view.isSecure && <StepSecure view={view} />}
      {view.isTax && (
        <div className={styles.tax}>
          <TaxDetailsForm
            mode="setup"
            fixture={view.taxFixture}
            value={state.tax ?? undefined}
            business={state.business}
            legalName={state.owner.name}
            businessName={state.profile.salon}
            onSubmit={view.taxSubmit}
          />
        </div>
      )}
      {view.isLearn && <StepLearn view={view} />}
      {view.isTaxCode && (
        <>
          <CodeField view={view} label="6-digit code" />
          <BusyButton
            className={styles.primary}
            isBusy={view.isBusy}
            label="Continue"
            onClick={view.taxCodeGo}
          />
        </>
      )}
      {view.isMethod && <StepMethod view={view} />}
      {view.isApp && <StepApp view={view} />}
      {view.isBackupStep && <StepBackup view={view} />}
      {view.isDone && (
        <button className={styles.primary} onClick={view.doneGo}>
          {view.doneLabel}
        </button>
      )}
      {view.isRemove && (
        <>
          <CodeField view={view} label="6-digit code" />
          <div className={styles.row10}>
            <button className={styles.cancel} onClick={view.close}>
              Cancel
            </button>
            <BusyButton
              className={styles.remove}
              isBusy={view.isBusy}
              label="Remove"
              onClick={view.removeGo}
            />
          </div>
        </>
      )}
    </>
  );
};

/** Get paid / two-step verification. */
interface TwoFactorDialogProps {
  studio: StudioController;
}

export const TwoFactorDialog = ({ studio }: TwoFactorDialogProps) => {
  const form = useTwoFactorForm(studio);
  const baseView = getTwoFactorView(studio);

  if (!baseView) return null;

  const { errors } = form.formState;
  const formError = errors.name?.message || errors.code?.message || "";

  const checked = (run: () => unknown) => () =>
    void form.handleSubmit(() => void run())();

  const view: TwoFactorView = {
    ...baseView,
    isNameError: !!errors.name || (!errors.code && baseView.isNameError),
    isCodeError: !!errors.code || (!errors.name && baseView.isCodeError),
    errorMessage: formError || baseView.errorMessage,
    onName: (event) => {
      form.clearErrors("name");
      baseView.onName(event);
    },
    onCode: (event) => {
      form.clearErrors("code");
      baseView.onCode(event);
    },
    verify: checked(baseView.verify),
    taxCodeGo: checked(baseView.taxCodeGo),
    removeGo: checked(baseView.removeGo),
  };

  const { isWide } = view;

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        className={joinClassNames(
          styles.scrim,
          view.isOut ? overlay.scrimOut16 : overlay.scrimIn26,
        )}
        onClick={view.close}
      ></div>
      <div
        className={joinClassNames(
          styles.dialog,
          isWide && styles.dialogWide,
          view.isTax && styles.dialogTax,
          getOverlayAnimation(view.isOut, "dialog", isWide),
        )}
        role="dialog"
        aria-modal="true"
        aria-label={view.title}
        data-screen-label="Two-step verification"
      >
        {view.isDone && (
          <div className={styles.doneClose}>
            <button
              className={styles.iconButton}
              onClick={view.close}
              aria-label="Close"
            >
              <X size={16} strokeWidth={1.8} />
            </button>
          </div>
        )}
        {view.isDone && (
          <span className={styles.tick}>
            <Check size={24} strokeWidth={2.6} />
          </span>
        )}
        {view.isProgressShown && (
          <div className={styles.progress}>{view.progress}</div>
        )}
        <div className={styles.head}>
          {view.canBack && (
            <button
              className={joinClassNames(styles.iconButton, styles.back)}
              onClick={view.back}
              aria-label="Back"
            >
              <ChevronLeft size={20} strokeWidth={2} />
            </button>
          )}
          <h2
            className={joinClassNames(
              styles.title,
              view.isCentred && styles.centred,
            )}
          >
            {view.title}
          </h2>
          {view.isCloseShown && (
            <button
              className={joinClassNames(styles.iconButton, styles.headClose)}
              onClick={view.close}
              aria-label="Close"
            >
              <X size={16} strokeWidth={1.8} />
            </button>
          )}
        </div>
        <p
          className={joinClassNames(
            styles.sub,
            view.isCentred && styles.centred,
          )}
        >
          {view.subtitle}
          {view.hasLearn && (
            <>
              {" "}
              <button className={styles.learnMore} onClick={view.openLearn}>
                Learn more
              </button>
            </>
          )}
        </p>
        <TwoFactorBody studio={studio} view={view} />
      </div>
    </>
  );
};

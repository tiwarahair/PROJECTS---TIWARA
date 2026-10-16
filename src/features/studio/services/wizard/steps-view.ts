import type { WizardContext } from "./context";
import { STEPS } from "./context";
import { saveService } from "./save";

const STEP_NAMES: Record<number, string> = {
  1: "Select a service",
  2: "Details",
  3: "Pricing",
  4: "Add-ons",
};

export const getStepsView = ({
  wizard,
  setWizard,
  stepIndex,
}: WizardContext) => ({
  isAdd: wizard.mode === "add",
  isEdit: wizard.mode === "edit",
  isStep2: wizard.step === 2,
  isStep3: wizard.step === 3,
  isStep4: wizard.step === 4,
  tabs: [
    { label: "Details", step: 2 },
    { label: "Pricing", step: 3 },
    { label: "Add-ons", step: 4 },
  ].map(({ label, step }) => ({
    key: step,
    label,
    isOn: wizard.step === step,
    pick: () => setWizard({ step, review: false }),
  })),
  isPricing: wizard.step === 3 && !wizard.review,
  isReview: wizard.step === 3 && wizard.review,
  dots: STEPS.map((step, index) => ({ key: step, isOn: index <= stepIndex })),
  stepLabel: `Step ${stepIndex + 1} of ${STEPS.length} · `,
  stepName:
    wizard.step === 3 && wizard.review
      ? "Review prices"
      : STEP_NAMES[wizard.step],
});

const getIsDisabled = ({ wizard, isVariationBad }: WizardContext) => {
  if (wizard.mode === "edit") return isVariationBad;

  if (wizard.step === 1) return true;

  return wizard.step === 3 && !wizard.review && isVariationBad;
};

export const getFooterView = (context: WizardContext) => {
  const { wizard, setWizard, stepIndex } = context;
  const isEdit = wizard.mode === "edit";
  const isLast = stepIndex === STEPS.length - 1;
  const isDisabled = getIsDisabled(context);

  const getCta = () => {
    if (isEdit) return "Save service";

    return isLast ? "Add service" : "Continue";
  };

  return {
    canBack: wizard.review || (wizard.mode === "add" && stepIndex > 0),
    back: () => {
      if (wizard.review) {
        setWizard({ review: false });

        return;
      }

      if (stepIndex > 0)
        setWizard({ step: STEPS[stepIndex - 1] as number, review: false });
    },
    next: () => {
      if (isDisabled) return;

      if (isEdit || (!wizard.review && isLast)) {
        saveService(context);

        return;
      }

      setWizard(
        wizard.review
          ? { review: false, step: 4 }
          : { step: STEPS[stepIndex + 1] as number },
      );
    },
    isDisabled,
    showStep: (step: number) => setWizard({ step, review: false }),
    cta: getCta(),
  };
};

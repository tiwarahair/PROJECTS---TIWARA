import type { StudioController } from "../../core/use-studio";
import type { WizardDraft, WizardState } from "../../core/types";
import { getTaxonomy } from "../../core/model";
import { getVariationErrors, getWizardBase, hasErrors } from "./adjust";
import { getReview } from "./review-view";

export const STEPS = [2, 3, 4];

export const getContext = (studio: StudioController) => {
  const { state, serviceActions } = studio;
  const wizard = state.sheet === "svcwiz" ? state.wizard : null;

  if (!wizard) return null;

  const { setWizard, setDraft } = serviceActions;
  const { draft } = wizard;
  const group = draft.taxonomyId ? getTaxonomy(state, draft.taxonomyId) : null;
  const stepIndex = STEPS.indexOf(wizard.step);
  const base = getWizardBase(draft);
  const isStep3Valid = base.basePrice > 0 && base.totalMinutes > 0;
  const sizes = draft.sizesOn ? draft.sizes || [] : [];
  const lengths = draft.lengthsOn ? draft.lengths || [] : [];

  const isVariationBad = sizes
    .concat(lengths)
    .some((row) => hasErrors(getVariationErrors(row, base)));

  const review = getReview(draft, base);

  const isReviewReady =
    review.sizes.length + review.lengths.length > 0 &&
    isStep3Valid &&
    !isVariationBad;

  return {
    studio,
    ...studio,
    wizard,
    draft,
    setWizard,
    setDraft,
    group,
    stepIndex,
    base,
    hasOptions: !!(draft.sizesOn || draft.lengthsOn),
    isVariationBad,
    review,
    isReviewReady,
  };
};

export type WizardContext = NonNullable<ReturnType<typeof getContext>>;

export const setLatestWizard = (
  { context, setState }: StudioController,
  patch: Partial<WizardState>,
  draftPatch: Partial<WizardDraft>,
) => {
  const current = context.getState().wizard;

  if (current)
    setState({
      wizard: {
        ...current,
        ...patch,
        draft: { ...current.draft, ...draftPatch },
      },
    });
};

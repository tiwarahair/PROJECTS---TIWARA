import type { OnboardingLayout } from "./onboarding-layout";
import type { OnboardingController } from "./use-onboarding";

/** Derived per-render values every screen reads (prototype renderVals: shown errors, canSubmit, turnstile). */
export interface ScreenView {
  /** Errors to show: field errors once touched, plus server errors. */
  shown: Record<string, string>;
  canSubmit: boolean;
  turnstileShown: boolean;
}

export interface ScreenProps {
  onboarding: OnboardingController;
  layout: OnboardingLayout;
  view: ScreenView;
}

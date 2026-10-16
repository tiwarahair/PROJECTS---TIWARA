import { Check } from "lucide-react";
import { useLayoutEffect } from "react";
import type { ComponentType } from "react";
import { joinClassNames } from "../../utils/class-names";
import { AuthShell } from "./auth-shell";
import {
  ChooserScreen,
  EmailScreen,
  PasswordScreen,
  WelcomeScreen,
} from "./auth-screens-entry";
import { CodeScreen, CreateScreen, SocialScreen } from "./auth-screens-account";
import {
  EndScreen,
  ForgotSentScreen,
  ProDoneScreen,
  ResetScreen,
  StudioScreen,
} from "./auth-screens-end";
import {
  RESEND_SCREENS,
  SCREEN_LABELS,
  TURNSTILE_SCREENS,
} from "./onboarding-data";
import "../../styles/features/onboarding/onboarding-page-global.module.css";
import { getLayout } from "./onboarding-layout";
import styles from "../../styles/features/onboarding/onboarding-page.module.css";
import { getErrors } from "./onboarding-screen-schemas";
import { isCodeScreen } from "./onboarding-state";
import type { OnboardingProps } from "./onboarding-state";
import type { ScreenProps, ScreenView } from "./screen-props";
import { TermsSheet } from "./terms-sheet";
import { useOnboarding } from "./use-onboarding";
import { useOnboardingRoute } from "./use-onboarding-route";
import { Wizard } from "./wizard";

const SHELL_SCREENS: Record<string, ComponentType<ScreenProps>> = {
  chooser: ChooserScreen,
  "cust-email": EmailScreen,
  "pro-email": EmailScreen,
  "forgot-email": EmailScreen,
  "cust-password": PasswordScreen,
  "pro-password": PasswordScreen,
  "cust-create": CreateScreen,
  "cust-social": SocialScreen,
  verify: CodeScreen,
  "pro-2fa": CodeScreen,
  "forgot-sent": ForgotSentScreen,
  "forgot-reset": ResetScreen,
  studio: StudioScreen,
  "pro-done": ProDoneScreen,
  "forgot-done": EndScreen,
};

/**
 * Log in (/login), customer sign-up (/signup) and the stylist set-up wizard (/join)
 * One page serves all three routes so answers carry across them.
 */
export const OnboardingPage = (props: OnboardingProps) => {
  const onboarding = useOnboarding(props);

  useOnboardingRoute(onboarding);
  const { state, props: resolved, rootRef, actions } = onboarding;
  const layout = getLayout(state, resolved);
  const { screen, isWizard, isDesktop, isDark, welcomeOver } = layout;

  // page-wide rules (cream / ink page, focus rings) apply while Onboarding is mounted
  useLayoutEffect(() => {
    document.documentElement.classList.add("onboarding-page");

    return () => document.documentElement.classList.remove("onboarding-page");
  }, []);

  const errors = getErrors({ ...state, isUpgrade: onboarding.isUpgrade });
  const shown: Record<string, string> = {};

  for (const [key, error] of Object.entries(onboarding.formErrors))
    if (error?.message) shown[key] = error.message;

  for (const [key, value] of Object.entries(state.serverErrors))
    if (value && typeof value === "string") shown[key] = value;

  // resend screens load the check only once Resend is tapped; their own submit never needs it
  const isResendScreen = RESEND_SCREENS.includes(screen);

  // a signed-in account becoming a stylist makes no sign-up, so needs no check
  const turnstileShown =
    (TURNSTILE_SCREENS.includes(screen) && !onboarding.isUpgrade) ||
    (isResendScreen && state.resendArmed);

  const view: ScreenView = {
    shown,
    turnstileShown,
    canSubmit:
      !state.busy &&
      !(state.lockedUntil > Date.now()) &&
      Object.keys(errors).length === 0 &&
      !(isCodeScreen(screen) && state.code.join("").length < 6),
  };

  const screenProps: ScreenProps = { onboarding, layout, view };
  const welcomeScreen = welcomeOver ? null : WelcomeScreen;

  const ShellScreen =
    screen === "welcome" ? welcomeScreen : SHELL_SCREENS[screen];

  return (
    <div
      ref={rootRef}
      data-screen-label={SCREEN_LABELS[screen] || screen}
      className={joinClassNames(
        styles.root,
        isDark ? styles.themeDark : styles.themeLight,
      )}
    >
      {!isWizard && (
        <AuthShell onboarding={onboarding} layout={layout}>
          {ShellScreen && <ShellScreen {...screenProps} />}
        </AuthShell>
      )}
      {isWizard && <Wizard {...screenProps} />}
      {!!state.toast && (
        <div role="status" className={styles.toast}>
          <Check size={18} strokeWidth={2.2} className={styles.toastIcon} />
          <span>{state.toast}</span>
        </div>
      )}
      {state.termsOn && (
        <TermsSheet
          kind={state.termsOn}
          isDesktop={isDesktop}
          onClose={() => actions.setState({ termsOn: null })}
        />
      )}
    </div>
  );
};

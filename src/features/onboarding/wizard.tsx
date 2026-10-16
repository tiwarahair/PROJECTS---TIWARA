import { getAssetUrl } from "../../utils/asset-url";
import { joinClassNames } from "../../utils/class-names";
import { WIZARD_TITLES } from "./onboarding-data";
import { ChevronLeft } from "lucide-react";
import { ModeIcon } from "./onboarding-fields";
import type { ScreenProps } from "./screen-props";
import { MapsProvider } from "../../lib/google-maps";
import { StepAccount } from "./step-account";
import { StepDetails } from "./step-details";
import { StepServices, StepSource, StepType } from "./wizard-steps";
import styles from "../../styles/features/onboarding/wizard.module.css";
import { AuthAlert } from "./auth-alert";

const STEPS = {
  w1: StepType,
  w2: StepServices,
  w3: (props: ScreenProps) => (
    <MapsProvider>
      <StepDetails {...props} />
    </MapsProvider>
  ),
  w4: StepAccount,
  w5: StepSource,
} as const;

const getSubtitle = (
  screen: string,
  businessType: string,
  isUpgrade: boolean,
): string =>
  ({
    w1: "Choose where you do most of your appointments.",
    w2: "Tap your main category first, then any others you offer.",
    w3:
      businessType === "mobile"
        ? "Clients see your travel area, not your address."
        : "Clients use this to find and book you.",
    w4: isUpgrade
      ? "From your account. You can change them in your account settings."
      : "You’ll use these to log in to Tiwára’s Studio.",
    w5: "Optional. It helps us reach more stylists like you.",
  })[screen] ?? "";

const getBodyWidthClass = (isDesktop: boolean, isTabletOrWider: boolean) => {
  if (isDesktop) return styles.bodyDesk;

  return isTabletOrWider ? styles.bodyMid : styles.bodyNarrow;
};

/** The 5-step stylist set-up: progress bar, Back / theme / Skip / Continue, then the step. */
export const Wizard = (props: ScreenProps) => {
  const { onboarding, layout, view } = props;
  const { state, actions } = onboarding;
  const { screen, step, isDesktop, isTabletOrWider, isDark } = layout;
  const Step = STEPS[screen as keyof typeof STEPS];
  const modeLabel = isDark ? "Switch to light mode" : "Switch to dark mode";
  const toggleMode = () => actions.setMode(isDark ? "light" : "dark");

  const submitLabel =
    screen === "w4" && !onboarding.isUpgrade ? "Create account" : "Continue";

  const isSkippable = screen === "w5";

  const submitClass = (base: string | undefined) =>
    joinClassNames(
      base,
      view.canSubmit || state.busy ? styles.submitOn : styles.submitOff,
      view.canSubmit ? styles.submitReady : styles.submitInert,
    );

  return (
    <div
      className={joinClassNames(
        styles.wizard,
        isDark ? styles.wizardDark : styles.wizardLight,
      )}
    >
      <div className={styles.topBar}>
        {isDesktop && (
          <>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={5}
              aria-valuenow={step}
              aria-label="Setup progress"
              className={styles.deskProgress}
            >
              <span data-step={step} className={styles.deskProgressFill}></span>
            </div>
            <div className={styles.deskBar}>
              <button
                onClick={actions.back}
                aria-label="Back"
                className={styles.deskBack}
              >
                <ChevronLeft size={20} strokeWidth={2} />
              </button>
              <img
                src={getAssetUrl(
                  isDark
                    ? "logos/logo-cream-sm.png"
                    : "logos/logo-crimson-sm.png",
                )}
                alt="Tiwára's House"
                className={styles.logo}
              />
              <span className={styles.grow}></span>
              <button
                onClick={toggleMode}
                aria-label={modeLabel}
                title={modeLabel}
                className={styles.deskMode}
              >
                <ModeIcon isDark={isDark} />
              </button>
              {isSkippable && (
                <button
                  onClick={actions.skipSource}
                  className={styles.deskSkip}
                >
                  Skip
                </button>
              )}
              <button
                onClick={actions.submit}
                disabled={!view.canSubmit}
                className={submitClass(styles.deskSubmit)}
              >
                {state.busy && (
                  <span
                    aria-hidden="true"
                    className={styles.spinnerSmall}
                  ></span>
                )}
                <span>{submitLabel}</span>
              </button>
            </div>
          </>
        )}
        {!isDesktop && (
          <div className={styles.mobileBar}>
            <button
              onClick={actions.back}
              aria-label="Back"
              className={styles.mobileBack}
            >
              <ChevronLeft size={22} strokeWidth={2} />
            </button>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={5}
              aria-valuenow={step}
              aria-label="Setup progress"
              className={styles.mobileProgress}
            >
              <span
                data-step={step}
                className={styles.mobileProgressFill}
              ></span>
            </div>
            <button
              onClick={toggleMode}
              aria-label={modeLabel}
              title={modeLabel}
              className={styles.mobileMode}
            >
              <ModeIcon isDark={isDark} />
            </button>
            {isSkippable && (
              <button
                onClick={actions.skipSource}
                className={styles.mobileSkip}
              >
                Skip
              </button>
            )}
          </div>
        )}
      </div>
      <div
        className={joinClassNames(
          styles.body,
          getBodyWidthClass(isDesktop, isTabletOrWider),
        )}
      >
        <div
          key={screen}
          className={joinClassNames(
            styles.screen,
            state.direction === "back" ? styles.enterBack : styles.enterForward,
          )}
        >
          <h1 className={styles.title}>
            {screen === "w4" && onboarding.isUpgrade
              ? "Your details"
              : (WIZARD_TITLES[screen] ?? "")}
          </h1>
          <p className={styles.sub}>
            {getSubtitle(screen, state.form.type, onboarding.isUpgrade)}
          </p>
          {Step && <Step {...props} />}
          <AuthAlert failure={state.failure} onRetry={actions.retry} />
        </div>
      </div>
      {!isDesktop && (
        <div className={styles.bottomBar}>
          <button
            onClick={actions.submit}
            disabled={!view.canSubmit}
            className={submitClass(styles.bottomSubmit)}
          >
            {state.busy && (
              <span aria-hidden="true" className={styles.spinner}></span>
            )}
            <span>{submitLabel}</span>
          </button>
        </div>
      )}
    </div>
  );
};

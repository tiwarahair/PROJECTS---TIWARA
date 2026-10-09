import { getAssetUrl } from "../../utils/asset-url";
import { joinClassNames } from "../../utils/class-names";
import { WIZARD_TITLES } from "./onboarding-data";
import { BackIcon, ModeIcon } from "./ob-fields";
import type { ScreenProps } from "./screen-props";
import {
  StepAccount,
  StepDetails,
  StepServices,
  StepSource,
  StepType,
} from "./wizard-steps";
import styles from "./wizard.module.css";

const STEPS = {
  w1: StepType,
  w2: StepServices,
  w3: StepDetails,
  w4: StepAccount,
  w5: StepSource,
} as const;

const getSubtitle = (screen: string, businessType: string): string =>
  ({
    w1: "Choose where you do most of your appointments.",
    w2: "Tap your main category first, then any others you offer.",
    w3:
      businessType === "mobile"
        ? "Clients see your travel area, not your address."
        : "Clients use this to find and book you.",
    w4: "You’ll use these to log in to Tiwára’s Studio.",
    w5: "Optional. It helps us reach more stylists like you.",
  })[screen] ?? "";

/** The 5-step stylist set-up: progress bar, Back / theme / Skip / Continue, then the step. */
export const Wizard = (props: ScreenProps) => {
  const { onboarding, layout, view } = props;
  const { state, actions } = onboarding;
  const { screen, step, desk, mid, isDark } = layout;
  const Step = STEPS[screen as keyof typeof STEPS];
  const modeLabel = isDark ? "Switch to light mode" : "Switch to dark mode";
  const toggleMode = () => actions.setMode(isDark ? "light" : "dark");
  const cta = screen === "w4" ? "Create account" : "Continue";
  const isSkippable = screen === "w5";
  const skip = () => {
    actions.setState({ codeKind: "verify" });
    actions.go("verify");
  };
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
        {desk && (
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
                <BackIcon />
              </button>
              <img
                src={getAssetUrl(
                  isDark
                    ? "_ds_assets/logo-cream-sm.png"
                    : "_ds_assets/logo-crimson-sm.png",
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
                <button onClick={skip} className={styles.deskSkip}>
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
                <span>{cta}</span>
              </button>
            </div>
          </>
        )}
        {!desk && (
          <div className={styles.mobileBar}>
            <button
              onClick={actions.back}
              aria-label="Back"
              className={styles.mobileBack}
            >
              <BackIcon size={22} />
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
              <button onClick={skip} className={styles.mobileSkip}>
                Skip
              </button>
            )}
          </div>
        )}
      </div>
      <div
        className={joinClassNames(
          styles.body,
          desk ? styles.bodyDesk : mid ? styles.bodyMid : styles.bodyNarrow,
        )}
      >
        <div
          key={screen}
          className={joinClassNames(
            styles.screen,
            state.dir === "back" ? styles.enterBack : styles.enterForward,
          )}
        >
          <h1 className={styles.title}>{WIZARD_TITLES[screen] ?? ""}</h1>
          <p className={styles.sub}>{getSubtitle(screen, state.f.type)}</p>
          {Step && <Step {...props} />}
        </div>
      </div>
      {!desk && (
        <div className={styles.bottomBar}>
          <button
            onClick={actions.submit}
            disabled={!view.canSubmit}
            className={submitClass(styles.bottomSubmit)}
          >
            {state.busy && (
              <span aria-hidden="true" className={styles.spinner}></span>
            )}
            <span>{cta}</span>
          </button>
        </div>
      )}
    </div>
  );
};

import { Check, Mail } from "lucide-react";
import { PasswordMeter } from "../../components/password-meter/password-meter";
import { joinClassNames } from "../../utils/class-names";
import { getOnboardingMeter } from "./auth-screens-account";
import { PasswordInput, SubmitButton, TextField } from "./onboarding-fields";
import { OnboardingTurnstile } from "./onboarding-turnstile";
import type { ScreenProps } from "./screen-props";
import styles from "../../styles/features/onboarding/auth-screens.module.css";
import { AuthAlert } from "./auth-alert";

const DoneBadge = () => (
  <span className={styles.doneBadge}>
    <Check size={26} strokeWidth={2.4} />
  </span>
);

export const ForgotSentScreen = ({ onboarding, layout, view }: ScreenProps) => {
  const { state, actions } = onboarding;
  const resendOff = state.resendIn > 0;

  return (
    <>
      <span className={styles.mailBadge}>
        <Mail size={24} strokeWidth={2} />
      </span>
      <h1 className={styles.title}>Check your email for a reset link</h1>
      <p className={styles.codeSub}>
        We sent a reset link to{" "}
        <strong className={styles.strongEmail}>{state.form.email}</strong>. The
        link works for 30 minutes.
      </p>
      {view.turnstileShown && (
        <OnboardingTurnstile
          isDark={layout.isDark}
          widgetRef={onboarding.turnstileRef}
          onToken={actions.setCaptchaToken}
        />
      )}
      <AuthAlert failure={state.failure} onRetry={actions.retry} />
      <div className={styles.sentLinks}>
        <button
          onClick={() => {
            if (!resendOff) actions.resend();
          }}
          className={joinClassNames(
            styles.resend,
            resendOff ? styles.resendWaiting : styles.resendReady,
          )}
        >
          {resendOff ? `Resend link in ${state.resendIn}s` : "Resend link"}
        </button>
        <button
          onClick={() =>
            actions.goTo(
              state.audience === "customer" ? "cust-email" : "pro-email",
              "back",
            )
          }
          className={styles.codeLink}
        >
          Back to log in
        </button>
      </div>
    </>
  );
};

export const ResetScreen = ({ onboarding, layout, view }: ScreenProps) => {
  const { state, actions } = onboarding;

  const { meter, role } = getOnboardingMeter(
    onboarding,
    layout.isDark,
    view.shown.password ?? "",
  );

  return (
    <>
      <h1 className={styles.chooserTitle}>Choose a new password</h1>
      <label htmlFor="ob-rpw" className={styles.label}>
        New password
      </label>
      <PasswordInput
        id="ob-rpw"
        shown={state.passwordShown}
        onToggle={() =>
          actions.setState({ passwordShown: !state.passwordShown })
        }
        {...actions.field("password")}
        autoComplete="new-password"
        invalid={!!view.shown.password}
        describedBy="ob-rpw-hint"
      />
      <PasswordMeter id="ob-rpw-hint" view={meter} messageRole={role} />
      <TextField
        id="ob-rpw2"
        label="Confirm new password"
        spacing="gap"
        type={state.passwordShown ? "text" : "password"}
        autoComplete="new-password"
        {...actions.field("passwordConfirm")}
        onKeyDown={(event) => {
          if (event.key === "Enter") actions.submit();
        }}
        error={view.shown.passwordConfirm ?? ""}
        invalid={!!view.shown.passwordConfirm}
      />
      <SubmitButton
        label="Update password"
        onClick={actions.submit}
        canSubmit={view.canSubmit}
        busy={state.busy}
        failure={state.failure}
        onRetry={actions.retry}
        variant="loose"
      />
    </>
  );
};

export const StudioScreen = () => (
  <div className={styles.studio}>
    <span aria-hidden="true" className={styles.studioSpinner}></span>
    <h1 role="status" className={styles.studioTitle}>
      Opening Tiwára’s Studio
    </h1>
    <p className={styles.studioText}>Taking you to your dashboard.</p>
  </div>
);

export const ProDoneScreen = ({ onboarding }: ScreenProps) => (
  <>
    <DoneBadge />
    <h1 className={styles.doneTitle}>You’re all set up</h1>
    <p className={styles.doneText}>
      Next, finish a few steps in Tiwára’s Studio to start taking bookings.
    </p>
    <button
      onClick={() => onboarding.actions.toStudio(true)}
      className={styles.doneButton}
    >
      Continue
    </button>
  </>
);

/** "Password updated" (forgot-done). */
export const EndScreen = ({ onboarding }: ScreenProps) => (
  <>
    <DoneBadge />
    <h1 className={styles.endTitle}>Password updated</h1>
    <p className={styles.doneText}>Log in with your new password.</p>
    <button
      onClick={() =>
        onboarding.actions.goTo(
          onboarding.state.audience === "customer" ? "cust-email" : "pro-email",
        )
      }
      className={styles.doneButton}
    >
      Back to log in
    </button>
  </>
);

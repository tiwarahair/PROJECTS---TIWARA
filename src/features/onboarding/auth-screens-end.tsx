import { PasswordMeter } from "../../components/password-meter/password-meter";
import { joinClassNames } from "../../utils/class-names";
import { getOnboardingMeter } from "./auth-screens-account";
import { PasswordInput, SubmitButton, TextField } from "./ob-fields";
import type { ScreenProps } from "./screen-props";
import styles from "./auth-screens.module.css";

const DoneBadge = () => (
  <span className={styles.doneBadge}>
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12l5 5L20 7"></path>
    </svg>
  </span>
);

export const ForgotSentScreen = ({ onboarding }: ScreenProps) => {
  const { state, actions } = onboarding;
  const resendOff = state.resendIn > 0;
  return (
    <>
      <span className={styles.mailBadge}>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 6h18v12H3zM3 7l9 6 9-6"></path>
        </svg>
      </span>
      <h1 className={styles.title}>Check your email for a reset link</h1>
      <p className={styles.codeSub}>
        We sent a reset link to{" "}
        <strong className={styles.strongEmail}>{state.f.email}</strong>. The
        link works for 30 minutes.
      </p>
      <button
        onClick={() => actions.go("forgot-reset")}
        className={styles.openLink}
      >
        Open reset link (demo)
      </button>
      <div className={styles.sentLinks}>
        <button
          onClick={() => {
            if (!resendOff)
              actions.setState({
                resendIn: 30,
                codeErr: "",
                code: ["", "", "", "", "", ""],
              });
          }}
          className={joinClassNames(
            styles.resend,
            resendOff ? styles.resendWaiting : styles.resendReady,
          )}
        >
          {resendOff ? "Resend link in " + state.resendIn + "s" : "Resend link"}
        </button>
        <button
          onClick={() =>
            actions.go(
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
  const { f } = state;
  const { meter, role } = getOnboardingMeter(
    onboarding,
    layout.isDark,
    view.shown.pw ?? "",
  );
  return (
    <>
      <h1 className={styles.chooserTitle}>Choose a new password</h1>
      <label htmlFor="ob-rpw" className={styles.label}>
        New password
      </label>
      <PasswordInput
        id="ob-rpw"
        value={f.pw}
        shown={state.pwShow}
        onToggle={() => actions.setState({ pwShow: !state.pwShow })}
        onChange={(event) => actions.setField("pw", event.target.value)}
        onBlur={() => actions.touch("pw")}
        autoComplete="new-password"
        invalid={!!view.shown.pw}
        describedBy="ob-rpw-hint"
      />
      <PasswordMeter id="ob-rpw-hint" view={meter} messageRole={role} />
      <TextField
        id="ob-rpw2"
        label="Confirm new password"
        spacing="gap"
        type={state.pwShow ? "text" : "password"}
        autoComplete="new-password"
        value={f.pw2}
        onChange={(event) => actions.setField("pw2", event.target.value)}
        onBlur={() => actions.touch("pw2")}
        onKeyDown={(event) => {
          if (event.key === "Enter") actions.submit();
        }}
        error={view.shown.pw2 ?? ""}
        invalid={!!view.shown.pw2}
      />
      <SubmitButton
        label="Update password"
        onClick={actions.submit}
        canSubmit={view.canSubmit}
        busy={state.busy}
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
        onboarding.actions.go(
          onboarding.state.audience === "customer" ? "cust-email" : "pro-email",
        )
      }
      className={styles.doneButton}
    >
      Back to log in
    </button>
  </>
);

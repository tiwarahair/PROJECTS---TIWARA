import { PasswordMeter } from "../../components/password-meter/password-meter";
import { joinClassNames } from "../../utils/class-names";
import { getPasswordView } from "../../utils/password";
import { OnboardingTurnstile } from "./onboarding-turnstile";
import {
  ClientConsent,
  MobileField,
  NameFields,
  PasswordInput,
  Spinner,
  SubmitButton,
} from "./onboarding-fields";
import { getPasswordCheck } from "./onboarding-state";
import type { OnboardingController } from "./use-onboarding";
import type { ScreenProps } from "./screen-props";
import styles from "../../styles/features/onboarding/auth-screens.module.css";

/** Strength meter view for the shell/wizard: a shown error replaces the hint. */
export const getOnboardingMeter = (
  onboarding: OnboardingController,
  isDark: boolean,
  shownError: string,
) => {
  const view = getPasswordView(getPasswordCheck(onboarding.state), {
    dark: isDark,
    show: !!shownError,
    errorColour: "var(--ob-err)",
  });

  const meter =
    shownError && !view.hasError
      ? {
          ...view,
          message: shownError,
          messageColour: "var(--ob-err)",
          messageWeight: 600,
          showMessage: true,
        }
      : view;

  return {
    meter,
    role: (meter.messageColour === "var(--ob-err)" ? "alert" : "note") as
      "alert" | "note",
  };
};

/** The name, mobile and consent fields shared by Create account and the social finish. */
const getCommonFields = ({ onboarding, view }: ScreenProps) => {
  const { state, actions } = onboarding;
  const { form } = state;
  const { shown } = view;

  return {
    names: (idPrefix: string) => (
      <NameFields
        idPrefix={idPrefix}
        first={{
          value: form.first,
          onChange: (event) => actions.setField("first", event.target.value),
          onBlur: () => actions.touch("first"),
          error: shown.first ?? "",
          invalid: !!shown.first,
        }}
        last={{
          value: form.last,
          onChange: (event) => actions.setField("last", event.target.value),
          onBlur: () => actions.touch("last"),
          error: shown.last ?? "",
          invalid: !!shown.last,
        }}
      />
    ),
    mobile: (id: string) => (
      <MobileField
        id={id}
        value={form.mobile}
        onChange={(event) => actions.setField("mobile", event.target.value)}
        onBlur={() => actions.touch("mobile")}
        error={shown.mobile ?? ""}
        invalid={!!shown.mobile}
      />
    ),
    consent: (
      <ClientConsent
        terms={form.terms}
        marketing={form.marketing}
        termsError={shown.terms ?? ""}
        onTerms={(event) =>
          actions.setField("terms", event.target.checked, true)
        }
        onMarketing={(event) =>
          actions.setField("marketing", event.target.checked, true)
        }
        onOpenClient={() => actions.setState({ termsOn: "client" })}
        onOpenPrivacy={() => actions.setState({ termsOn: "privacy" })}
      />
    ),
  };
};

export const CreateScreen = (props: ScreenProps) => {
  const { onboarding, layout, view } = props;
  const { state, actions } = onboarding;
  const { form } = state;
  const { names, mobile, consent } = getCommonFields(props);

  const { meter, role } = getOnboardingMeter(
    onboarding,
    layout.isDark,
    view.shown.password ?? "",
  );

  return (
    <>
      <h1 className={styles.title}>Create account</h1>
      <p className={styles.createSub}>
        {form.email}{" "}
        <button
          onClick={() =>
            actions.goTo(layout.isPro ? "pro-email" : "cust-email", "back")
          }
          className={styles.changeInline}
        >
          Change
        </button>
      </p>
      {names("ob-")}
      <label htmlFor="ob-npw" className={styles.labelNext}>
        Password
      </label>
      <PasswordInput
        id="ob-npw"
        value={form.password}
        shown={state.passwordShown}
        onToggle={() =>
          actions.setState({ passwordShown: !state.passwordShown })
        }
        onChange={(event) => actions.setField("password", event.target.value)}
        onBlur={() => actions.touch("password")}
        autoComplete="new-password"
        invalid={!!view.shown.password}
        describedBy="ob-npw-hint"
      />
      <PasswordMeter id="ob-npw-hint" view={meter} messageRole={role} />
      {mobile("ob-mob")}
      {consent}
      {!!state.serverErrors.exists && (
        <div role="alert" className={styles.exists}>
          <span className={styles.existsText}>
            You already have an account with this email
          </span>
          <button
            onClick={() => {
              actions.setState({ audience: "customer" });
              actions.goTo("cust-password");
            }}
            className={styles.loginInstead}
          >
            Log in instead
          </button>
        </div>
      )}
      {view.turnstileShown && (
        <OnboardingTurnstile
          status={state.turnstile}
          isDark={layout.isDark}
          onCheck={actions.checkTurnstile}
        />
      )}
      <SubmitButton
        label="Create account"
        onClick={actions.submit}
        canSubmit={view.canSubmit}
        busy={state.busy}
        variant="loose"
      />
    </>
  );
};

/** After Google / Apple with an unknown email: confirm names, add a mobile, agree to terms. */
export const SocialScreen = (props: ScreenProps) => {
  const { onboarding, view } = props;
  const { state, actions } = onboarding;
  const { form } = state;
  const { names, mobile, consent } = getCommonFields(props);

  return (
    <>
      <h1 className={styles.title}>Finish creating your account</h1>
      <p className={styles.lead}>
        {state.socialProvider === "apple"
          ? "Signed in with Apple. Check your name, then add your mobile."
          : "Signed in with Google. Check your name, then add your mobile."}
      </p>
      {names("ob-s")}
      <div className={styles.readonlyLabel}>Email address</div>
      <div aria-readonly="true" className={styles.readonlyEmail}>
        <span className={styles.readonlyText}>{form.email}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={styles.subIcon}
        >
          <path d="M6 11h12v10H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3"></path>
        </svg>
      </div>
      {/privaterelay\.appleid\.com$/i.test(form.email) && (
        <div className={styles.relayNote}>
          Apple’s private relay address. Emails we send reach your Apple ID
          inbox.
        </div>
      )}
      {mobile("ob-smob")}
      {consent}
      <button
        onClick={actions.submit}
        aria-disabled={view.canSubmit ? "false" : "true"}
        className={styles.socialContinue}
      >
        {state.busy && <Spinner />}
        <span>Continue</span>
      </button>
    </>
  );
};

const getCodeBoxClass = (hasError: boolean, digit: string) => {
  if (hasError) return styles.codeBoxError;

  return digit ? styles.codeBoxFilled : styles.codeBoxEmpty;
};

/** Verify email (after sign-up) and pro 2FA: six digit boxes, resend countdown and help links. */
export const CodeScreen = ({ onboarding, view }: ScreenProps) => {
  const { state, actions, codeRefs } = onboarding;
  const { form, code, codeError } = state;
  const is2fa = state.screen === "pro-2fa";
  const resendOff = state.resendIn > 0;
  const isBackup = state.twoFaMethod === "backup";

  const links = is2fa
    ? [
        {
          key: "b",
          label: isBackup
            ? "Use your authenticator app"
            : "Use your backup authenticator",
          onSelect: () =>
            actions.setState({
              twoFaMethod: isBackup ? "app" : "backup",
              code: ["", "", "", "", "", ""],
              codeError: "",
            }),
        },
        {
          key: "c",
          label: "Lost your phone? Contact support",
          onSelect: () => {},
        },
      ]
    : [
        {
          key: "c",
          label: "Change email",
          onSelect: () =>
            actions.goTo(
              state.audience === "customer" ? "cust-create" : "w4",
              "back",
            ),
        },
      ];

  const twoFactorSub = isBackup
    ? "Enter the code from your backup authenticator."
    : "Enter the code from your authenticator app.";

  return (
    <>
      <h1 className={styles.title}>
        {is2fa ? "Enter your 6-digit code" : "Check your email"}
      </h1>
      <p className={styles.codeSub}>
        {is2fa ? twoFactorSub : `We sent a 6-digit code to ${form.email}`}
      </p>
      <div
        onPaste={actions.pasteCode}
        role="group"
        aria-label="6-digit code"
        className={joinClassNames(
          styles.codeBoxes,
          !!state.shake && styles.shake,
        )}
      >
        {code.map((digit, index) => (
          <input
            key={`c${index}`}
            ref={codeRefs[index]}
            value={digit}
            onChange={(event) =>
              actions.setCodeDigit(index, event.target.value)
            }
            onFocus={(event) => event.target.select()}
            onKeyDown={(event) => actions.handleCodeKey(index, event)}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={1}
            aria-label={`Digit ${index + 1}`}
            className={joinClassNames(
              styles.codeBox,
              getCodeBoxClass(!!codeError, digit),
            )}
          />
        ))}
      </div>
      <div role="alert" aria-live="assertive" className={styles.codeError}>
        {codeError}
      </div>
      {is2fa && (
        <label className={styles.remember}>
          <input
            type="checkbox"
            checked={form.remember}
            onChange={(event) =>
              actions.setField("remember", event.target.checked, true)
            }
            className={styles.rememberBox}
          />
          <span>Remember this device for 30 days</span>
        </label>
      )}
      <SubmitButton
        label="Continue"
        onClick={actions.submit}
        canSubmit={view.canSubmit}
        busy={state.busy}
        variant="code"
      />
      <div className={styles.codeLinks}>
        {!is2fa && (
          <button
            onClick={() => {
              if (!resendOff)
                actions.setState({
                  resendIn: 30,
                  codeError: "",
                  code: ["", "", "", "", "", ""],
                });
            }}
            aria-disabled={resendOff ? "true" : "false"}
            className={joinClassNames(
              styles.resend,
              resendOff ? styles.resendWaiting : styles.resendReady,
            )}
          >
            {resendOff ? `Resend code in ${state.resendIn}s` : "Resend code"}
          </button>
        )}
        {links.map(({ key, label, onSelect }) => (
          <button key={key} onClick={onSelect} className={styles.codeLink}>
            {label}
          </button>
        ))}
      </div>
    </>
  );
};

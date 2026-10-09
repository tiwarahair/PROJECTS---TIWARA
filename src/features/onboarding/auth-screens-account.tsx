import { PasswordMeter } from "../../components/password-meter/password-meter";
import { joinClassNames } from "../../utils/class-names";
import { getPasswordView } from "../../utils/password";
import { ObTurnstile } from "./ob-turnstile";
import {
  ClientConsent,
  MobileField,
  NameFields,
  PasswordInput,
  Spinner,
  SubmitButton,
} from "./ob-fields";
import { getPasswordCheck } from "./onboarding-state";
import type { OnboardingController } from "./use-onboarding";
import type { ScreenProps } from "./screen-props";
import styles from "./auth-screens.module.css";

/** Strength meter view for the shell/wizard (prototype pm): a shown error replaces the hint. */
export const getOnboardingMeter = (
  onboarding: OnboardingController,
  isDark: boolean,
  shownError: string,
) => {
  const view = getPasswordView(getPasswordCheck(onboarding.state), {
    dark: isDark,
    show: !!shownError,
    errColor: "var(--ob-err)",
  });
  const meter =
    shownError && !view.hasErr
      ? {
          ...view,
          msg: shownError,
          msgC: "var(--ob-err)",
          msgW: 600,
          msgOn: true,
        }
      : view;
  return {
    meter,
    role: (meter.msgC === "var(--ob-err)" ? "alert" : "note") as
      "alert" | "note",
  };
};

/** The name, mobile and consent fields shared by Create account and the social finish. */
const getCommonFields = ({ onboarding, view }: ScreenProps) => {
  const { state, actions } = onboarding;
  const { f } = state;
  const { shown } = view;
  return {
    names: (idPrefix: string) => (
      <NameFields
        idPrefix={idPrefix}
        first={{
          value: f.first,
          onChange: (event) => actions.setField("first", event.target.value),
          onBlur: () => actions.touch("first"),
          error: shown.first ?? "",
          invalid: !!shown.first,
        }}
        last={{
          value: f.last,
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
        value={f.mob}
        onChange={(event) => actions.setField("mob", event.target.value)}
        onBlur={() => actions.touch("mob")}
        error={shown.mob ?? ""}
        invalid={!!shown.mob}
      />
    ),
    consent: (
      <ClientConsent
        terms={f.terms}
        marketing={f.mkt}
        termsError={shown.terms ?? ""}
        onTerms={(event) =>
          actions.setField("terms", event.target.checked, true)
        }
        onMarketing={(event) =>
          actions.setField("mkt", event.target.checked, true)
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
  const { f } = state;
  const { names, mobile, consent } = getCommonFields(props);
  const { meter, role } = getOnboardingMeter(
    onboarding,
    layout.isDark,
    view.shown.pw ?? "",
  );
  return (
    <>
      <h1 className={styles.title}>Create account</h1>
      <p className={styles.createSub}>
        {f.email}{" "}
        <button
          onClick={() =>
            actions.go(layout.isPro ? "pro-email" : "cust-email", "back")
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
        value={f.pw}
        shown={state.pwShow}
        onToggle={() => actions.setState({ pwShow: !state.pwShow })}
        onChange={(event) => actions.setField("pw", event.target.value)}
        onBlur={() => actions.touch("pw")}
        autoComplete="new-password"
        invalid={!!view.shown.pw}
        describedBy="ob-npw-hint"
      />
      <PasswordMeter id="ob-npw-hint" view={meter} messageRole={role} />
      {mobile("ob-mob")}
      {consent}
      {!!state.err.exists && (
        <div role="alert" className={styles.exists}>
          <span className={styles.existsText}>
            You already have an account with this email
          </span>
          <button
            onClick={() => {
              actions.setState({ audience: "customer" });
              actions.go("cust-password");
            }}
            className={styles.loginInstead}
          >
            Log in instead
          </button>
        </div>
      )}
      {view.turnstileShown && (
        <ObTurnstile
          ts={state.ts}
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
  const { f } = state;
  const { names, mobile, consent } = getCommonFields(props);
  return (
    <>
      <h1 className={styles.title}>Finish creating your account</h1>
      <p className={styles.lead}>
        {state.socialP === "apple"
          ? "Signed in with Apple. Check your name, then add your mobile."
          : "Signed in with Google. Check your name, then add your mobile."}
      </p>
      {names("ob-s")}
      <div className={styles.readonlyLabel}>Email address</div>
      <div aria-readonly="true" className={styles.readonlyEmail}>
        <span className={styles.readonlyText}>{f.email}</span>
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
      {/privaterelay\.appleid\.com$/i.test(f.email) && (
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

/** Verify email (after sign-up) and pro 2FA: six digit boxes, resend countdown and help links. */
export const CodeScreen = ({ onboarding, view }: ScreenProps) => {
  const { state, actions, codeRefs } = onboarding;
  const { f, code, codeErr } = state;
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
          go: () =>
            actions.setState({
              twoFaMethod: isBackup ? "app" : "backup",
              code: ["", "", "", "", "", ""],
              codeErr: "",
            }),
        },
        { key: "c", label: "Lost your phone? Contact support", go: () => {} },
      ]
    : [
        {
          key: "c",
          label: "Change email",
          go: () =>
            actions.go(
              state.audience === "customer" ? "cust-create" : "w4",
              "back",
            ),
        },
      ];
  return (
    <>
      <h1 className={styles.title}>
        {is2fa ? "Enter your 6-digit code" : "Check your email"}
      </h1>
      <p className={styles.codeSub}>
        {is2fa
          ? isBackup
            ? "Enter the code from your backup authenticator."
            : "Enter the code from your authenticator app."
          : "We sent a 6-digit code to " + f.email}
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
            key={"c" + index}
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
            aria-label={"Digit " + (index + 1)}
            className={joinClassNames(
              styles.codeBox,
              codeErr
                ? styles.codeBoxError
                : digit
                  ? styles.codeBoxFilled
                  : styles.codeBoxEmpty,
            )}
          />
        ))}
      </div>
      <div role="alert" aria-live="assertive" className={styles.codeError}>
        {codeErr}
      </div>
      {is2fa && (
        <label className={styles.remember}>
          <input
            type="checkbox"
            checked={f.remember}
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
                  codeErr: "",
                  code: ["", "", "", "", "", ""],
                });
            }}
            aria-disabled={resendOff ? "true" : "false"}
            className={joinClassNames(
              styles.resend,
              resendOff ? styles.resendWaiting : styles.resendReady,
            )}
          >
            {resendOff
              ? "Resend code in " + state.resendIn + "s"
              : "Resend code"}
          </button>
        )}
        {links.map(({ key, label, go }) => (
          <button key={key} onClick={go} className={styles.codeLink}>
            {label}
          </button>
        ))}
      </div>
    </>
  );
};

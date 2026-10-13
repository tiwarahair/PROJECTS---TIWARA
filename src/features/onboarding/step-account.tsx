import type { ChangeEvent, ReactNode } from "react";
import { PasswordMeter } from "../../components/password-meter/password-meter";
import { joinClassNames } from "../../utils/class-names";
import { getOnboardingMeter } from "./auth-screens-account";
import { OnboardingTurnstile } from "./onboarding-turnstile";
import type { ScreenProps } from "./screen-props";
import { WizardField } from "./wizard-field";
import fieldStyles from "../../styles/features/onboarding/wizard-field.module.css";
import styles from "../../styles/features/onboarding/step-account.module.css";

const getAriaInvalid = (invalid: boolean | undefined) => {
  if (invalid === undefined) return undefined;

  return invalid ? "true" : "false";
};

const Checkbox = ({
  checked,
  onChange,
  invalid,
  className,
  children,
}: {
  checked: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  invalid?: boolean;
  className: string | undefined;
  children: ReactNode;
}) => (
  <label className={className}>
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-invalid={getAriaInvalid(invalid)}
      className={styles.checkbox}
    />
    {children}
  </label>
);

/** Step 4: the stylist's account (8+ character password), business contact and Partner Terms. */
export const StepAccount = ({ onboarding, layout, view }: ScreenProps) => {
  const { state, actions, isUpgrade } = onboarding;
  const { form } = state;
  const { shown } = view;

  const text = (key: "first" | "last" | "email") => ({
    ...actions.field(key),
    error: shown[key] ?? "",
    readOnly: isUpgrade,
  });

  const { meter, role } = getOnboardingMeter(
    onboarding,
    layout.isDark,
    shown.password ?? "",
  );

  return (
    <>
      <div className={styles.nameRow}>
        <div className={styles.nameCell}>
          <WizardField
            id="ob-wfirst"
            label="First name"
            autoComplete="given-name"
            {...text("first")}
          />
        </div>
        <div className={styles.nameCell}>
          <WizardField
            id="ob-wlast"
            label="Last name"
            autoComplete="family-name"
            {...text("last")}
          />
        </div>
      </div>
      <WizardField
        id="ob-wemail"
        label="Email address"
        spacing="next"
        type="email"
        inputMode="email"
        autoComplete="email"
        {...text("email")}
      />
      <label htmlFor="ob-wmob" className={fieldStyles.labelNext}>
        Mobile
      </label>
      <div
        className={joinClassNames(
          styles.mobileWrap,
          shown.mobile ? fieldStyles.borderError : fieldStyles.border,
        )}
      >
        <span className={styles.prefix}>+44</span>
        <input
          id="ob-wmob"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          {...actions.field("mobile")}
          readOnly={isUpgrade}
          aria-invalid={shown.mobile ? "true" : "false"}
          className={styles.mobileInput}
        />
      </div>
      <div role="alert" className={fieldStyles.error}>
        {shown.mobile ?? ""}
      </div>
      {!isUpgrade && (
        <>
          <label htmlFor="ob-wpw" className={fieldStyles.labelNext}>
            Password
          </label>
          <div className={styles.passwordWrap}>
            <input
              id="ob-wpw"
              type={state.passwordShown ? "text" : "password"}
              autoComplete="new-password"
              {...actions.field("password")}
              aria-invalid={shown.password ? "true" : "false"}
              aria-describedby="ob-wpw-hint"
              className={joinClassNames(
                styles.passwordInput,
                shown.password ? fieldStyles.borderError : fieldStyles.border,
              )}
            />
            <button
              onClick={() =>
                actions.setState({ passwordShown: !state.passwordShown })
              }
              aria-label={
                state.passwordShown ? "Hide password" : "Show password"
              }
              className={styles.passwordToggle}
            >
              {state.passwordShown ? "Hide" : "Show"}
            </button>
          </div>
          <PasswordMeter id="ob-wpw-hint" view={meter} messageRole={role} />
        </>
      )}
      <Checkbox
        checked={form.useContact}
        onChange={(event) =>
          actions.setField("useContact", event.target.checked, true)
        }
        className={styles.useContact}
      >
        <span>Use these details for clients to contact me</span>
      </Checkbox>
      {!form.useContact && (
        <div className={styles.bizContact}>
          <label htmlFor="ob-bph" className={fieldStyles.label}>
            Business phone
          </label>
          <input
            id="ob-bph"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            {...actions.field("businessPhone")}
            className={styles.bizInput}
          />
          <label htmlFor="ob-bem" className={styles.bizEmailLabel}>
            Business email
          </label>
          <input
            id="ob-bem"
            type="email"
            inputMode="email"
            autoComplete="off"
            {...actions.field("businessEmail")}
            className={styles.bizInput}
          />
          <div
            role="alert"
            className={joinClassNames(
              styles.bizHelp,
              shown.businessContact
                ? fieldStyles.helpError
                : styles.bizHelpMuted,
            )}
          >
            {shown.businessContact || "Add at least one"}
          </div>
        </div>
      )}
      <Checkbox
        checked={form.terms}
        onChange={(event) =>
          actions.setField("terms", event.target.checked, true)
        }
        invalid={!!shown.terms}
        className={styles.termsLabel}
      >
        <span>
          I agree to the{" "}
          <button
            onClick={() => actions.setState({ termsOn: "partner" })}
            className={styles.termsLink}
          >
            Partner Terms
          </button>{" "}
          and{" "}
          <button
            onClick={() => actions.setState({ termsOn: "privacy" })}
            className={styles.termsLink}
          >
            Privacy Policy
          </button>
          , and confirm I have the right to work in the UK and any insurance and
          licences my services need.
        </span>
      </Checkbox>
      <div role="alert" className={styles.termsError}>
        {shown.terms ?? ""}
      </div>
      {view.turnstileShown && (
        <OnboardingTurnstile
          isDark={layout.isDark}
          widgetRef={onboarding.turnstileRef}
          onToken={actions.setCaptchaToken}
        />
      )}
      {!!state.serverErrors.exists && (
        <div role="alert" className={styles.exists}>
          <span className={styles.existsText}>
            <span className={styles.existsTitle}>
              You already have an account with this email
            </span>
            <span className={styles.existsSub}>Your answers are saved.</span>
          </span>
          <button
            onClick={() => {
              actions.setState({ audience: "pro" });
              actions.goTo("pro-password");
            }}
            className={styles.loginInstead}
          >
            Log in instead
          </button>
        </div>
      )}
    </>
  );
};

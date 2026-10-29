import { joinClassNames } from "../../utils/class-names";
import { PasswordMeter } from "../password-meter";
import type { AccountSettingsProps } from "./use-account-settings";
import type { AccountSettingsController } from "./use-account-settings";
import { CheckRow, SettingsSection } from "./fields";
import { SettingsSessions } from "./sessions";
import { SettingsTwoFactor } from "./two-factor";
import shared from "../../styles/components/account-settings/index.module.css";
import styles from "../../styles/components/account-settings/security.module.css";

interface SettingsSecurityProps {
  settings: AccountSettingsController;
  uid: string;
  props: AccountSettingsProps;
}

export const SettingsSecurity = ({
  settings,
  uid,
  props,
}: SettingsSecurityProps) => {
  const {
    state,
    setState,
    isSocial,
    showPasswordFields,
    passwordForm,
    passwordView,
    passwordErrors,
    sendPasswordCode,
  } = settings;

  const { register, setValue, clearErrors } = passwordForm;
  const clearServerError = () => clearErrors("root");

  const passwordFields = [
    {
      key: "next" as const,
      label: "New password",
      autoComplete: "new-password",
      error: passwordErrors.next,
    },
    {
      key: "confirm" as const,
      label: "Confirm new password",
      autoComplete: "new-password",
      error: passwordErrors.confirm,
    },
  ];

  return (
    <>
      <SettingsSection label="Password" heading="Password">
        <div className={shared.card}>
          {isSocial && !state.isSettingPassword && (
            <div className={styles.socialIntro}>
              <p className={styles.socialText}>
                You sign in with Google. Set a password to also sign in with
                email.
              </p>
              <button
                className={joinClassNames(styles.setPassword, shared.focusRing)}
                data-ac-in="1"
                onClick={() => setState({ isSettingPassword: true })}
              >
                Set password
              </button>
            </div>
          )}
          {showPasswordFields && (
            <div className={styles.pwFields}>
              {passwordFields.map(({ key, label, autoComplete, error }) => {
                const id = `${uid}-${key}`;
                const isNew = key === "next";

                return (
                  <div key={key}>
                    <label className={shared.label} htmlFor={id}>
                      {label}
                    </label>
                    <input
                      className={joinClassNames(
                        styles.pwInput,
                        shared.focusRing,
                        error ? shared.fieldErr : shared.fieldOk,
                      )}
                      data-ac-in="1"
                      id={id}
                      type="password"
                      autoComplete={autoComplete}
                      aria-invalid={error ? "true" : "false"}
                      aria-describedby={isNew ? `${id}-hint` : ""}
                      {...register(key, {
                        onChange: clearServerError,
                        deps: isNew ? ["confirm"] : [],
                      })}
                    />
                    {/* the new password's error shows in the meter, not as a line */}
                    {!isNew && !!error && (
                      <div className={shared.error} role="alert">
                        {error}
                      </div>
                    )}
                    {isNew && (
                      <PasswordMeter id={`${id}-hint`} view={passwordView} />
                    )}
                  </div>
                );
              })}
              {state.isPasswordCodeSent && (
                <div>
                  <label className={shared.label} htmlFor={`${uid}-pc`}>
                    Code from your email
                  </label>
                  <div className={styles.codeRow}>
                    <input
                      className={joinClassNames(
                        styles.pwInput,
                        shared.focusRing,
                        passwordErrors.code ? shared.fieldErr : shared.fieldOk,
                      )}
                      data-ac-in="1"
                      id={`${uid}-pc`}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      aria-invalid={passwordErrors.code ? "true" : "false"}
                      {...register("code", {
                        onChange: (event: { target: { value: string } }) => {
                          clearServerError();

                          setValue(
                            "code",
                            event.target.value.replace(/\D/g, "").slice(0, 6),
                          );
                        },
                      })}
                    />
                    <button
                      className={joinClassNames(
                        shared.outlineButton,
                        shared.focusRing,
                      )}
                      data-ac-in="1"
                      onClick={() => void sendPasswordCode()}
                    >
                      Resend code
                    </button>
                  </div>
                  {!!passwordErrors.code && (
                    <div className={shared.error} role="alert">
                      {passwordErrors.code}
                    </div>
                  )}
                  <div className={shared.help}>
                    {`It’s been a while since you signed in, so we emailed a code to ${state.email} to check it’s you.`}
                  </div>
                </div>
              )}
              {!!passwordErrors.server && (
                <div className={shared.error} role="alert">
                  {passwordErrors.server}
                </div>
              )}
              <CheckRow
                isOn={state.signOthers}
                onToggle={() => setState({ signOthers: !state.signOthers })}
              >
                <span className={shared.strongText}>
                  Sign me out on other devices
                </span>
              </CheckRow>
            </div>
          )}
        </div>
      </SettingsSection>

      <SettingsTwoFactor props={props} />
      <SettingsSessions settings={settings} />
    </>
  );
};

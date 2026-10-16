import { ArrowRight, Clock } from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import { isValidEmail } from "../../utils/validation";
import { Reveal, SettingsSection, TextField } from "./settings-fields";
import { getLoginDetailsActions } from "./login-details-actions";
import type { AccountSettingsProps } from "./use-account-settings";
import type { AccountSettingsController } from "./use-account-settings";
import shared from "../../styles/components/account-settings/account-settings.module.css";
import styles from "../../styles/components/account-settings/settings-login-details.module.css";

interface SettingsLoginDetailsProps {
  settings: AccountSettingsController;
  uid: string;
  props: AccountSettingsProps;
}

/** Settings → Personal → Login details: the login email (a code to each address) and the mobile. */
export const SettingsLoginDetails = ({
  settings,
  uid,
  props,
}: SettingsLoginDetailsProps) => {
  const { state, setState } = settings;
  const login = getLoginDetailsActions(settings);

  const newEmailError =
    state.emailError ||
    (state.emailTouched && !isValidEmail(state.newEmail)
      ? "Enter an email address, like name@example.co.uk."
      : "");

  const phoneClass = state.phoneError ? shared.fieldErr : shared.fieldOk;

  return (
    <SettingsSection
      label="Login details"
      heading="Login details"
      intro={
        <>
          <p className={shared.introText}>
            Used for your account, security and payout messages. Client-facing
            contact details are in Business details.
          </p>
          <button
            className={joinClassNames(styles.linkButton, shared.focusRing)}
            data-ac-in="1"
            onClick={() => props.onNavigate?.("business")}
          >
            Business details
            <ArrowRight size={15} strokeWidth={1.7} />
          </button>
        </>
      }
    >
      <div className={shared.card}>
        <div className={shared.row}>
          <div className={shared.rowText}>
            <div className={shared.rowLabel}>Login email</div>
            <div className={shared.rowValue}>{state.email}</div>
          </div>
          {!state.emailFlow && !state.pendingEmail && (
            <button
              className={joinClassNames(shared.outlineButton, shared.focusRing)}
              data-ac-in="1"
              onClick={() =>
                setState({
                  emailFlow: "edit",
                  newEmail: "",
                  emailTouched: false,
                  emailError: "",
                })
              }
            >
              Change
            </button>
          )}
        </div>
        {!!state.pendingEmail && (
          <div className={styles.pending} role="status">
            <div className={styles.pendingTitle}>
              <Clock size={16} strokeWidth={1.7} />
              Confirm your new email
            </div>
            <p className={styles.pendingText}>
              We sent a 6-digit code to{" "}
              <strong className={styles.strong}>{state.email}</strong> and
              another to{" "}
              <strong className={styles.strong}>{state.pendingEmail}</strong>.
              Your login email changes once both are in.
            </p>
            <div className={styles.emailForm}>
              {(
                [
                  ["current", state.email],
                  ["next", state.pendingEmail],
                ] as const
              )
                .filter(
                  ([key]) => key === "next" || !state.isCurrentEmailConfirmed,
                )
                .map(([key, address]) => (
                  <TextField
                    key={key}
                    id={`${uid}-email-${key}`}
                    label={`Code sent to ${address}`}
                    value={state.emailCodes[key]}
                    error=""
                    onChange={(event) =>
                      login.setEmailCode(key, event.target.value)
                    }
                    className={styles.codeInput}
                    autoComplete="one-time-code"
                  />
                ))}
            </div>
            {!!state.emailError && (
              <div className={shared.error} role="alert">
                {state.emailError}
              </div>
            )}
            <div className={styles.pendingActions}>
              <button
                className={joinClassNames(shared.darkButton, shared.focusRing)}
                data-ac-in="1"
                onClick={() => void login.confirmEmail()}
              >
                Confirm
              </button>
              <button
                className={joinClassNames(styles.resend, shared.focusRing)}
                data-ac-in="1"
                onClick={() => void login.resendEmailCodes()}
              >
                Resend codes
              </button>
              <button
                className={joinClassNames(
                  styles.cancelChange,
                  shared.focusRing,
                )}
                data-ac-in="1"
                onClick={login.cancelEmail}
              >
                Cancel change
              </button>
            </div>
          </div>
        )}
        <Reveal open={state.emailFlow === "edit"}>
          <div className={styles.emailForm}>
            <TextField
              id={`${uid}-ne`}
              label="New email"
              type="email"
              autoComplete="email"
              value={state.newEmail}
              error={newEmailError}
              onChange={(event) =>
                setState({ newEmail: event.target.value, emailError: "" })
              }
              className={styles.input}
            />
            <div className={shared.help}>
              We’ll email a code to this address and one to your current
              address.
            </div>
            <div className={styles.formActions}>
              <button
                className={joinClassNames(shared.darkButton, shared.focusRing)}
                data-ac-in="1"
                onClick={() => void login.startEmailChange()}
              >
                Send codes
              </button>
              <button
                className={joinClassNames(styles.cancel, shared.focusRing)}
                data-ac-in="1"
                onClick={() =>
                  setState({
                    emailFlow: null,
                    emailTouched: false,
                    emailError: "",
                  })
                }
              >
                Cancel
              </button>
            </div>
          </div>
        </Reveal>

        <div className={styles.divider}></div>

        <div className={shared.row}>
          <div className={shared.rowText}>
            <div className={shared.rowLabel}>Mobile</div>
            <div className={styles.phoneValue}>{state.phone}</div>
          </div>
          {!state.phoneFlow && (
            <button
              className={joinClassNames(shared.outlineButton, shared.focusRing)}
              data-ac-in="1"
              onClick={() =>
                setState({ phoneFlow: "edit", newPhone: "", phoneError: "" })
              }
            >
              Change
            </button>
          )}
        </div>
        <Reveal open={!!state.phoneFlow}>
          <div className={styles.phoneForm}>
            <label className={shared.label} htmlFor={`${uid}-np`}>
              New phone number
            </label>
            <input
              className={joinClassNames(
                styles.phoneInput,
                shared.focusRing,
                phoneClass,
              )}
              data-ac-in="1"
              id={`${uid}-np`}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={state.newPhone}
              onChange={(event) =>
                setState({ newPhone: event.target.value, phoneError: "" })
              }
              aria-invalid={state.phoneError ? "true" : "false"}
            />
            {!!state.phoneError && (
              <div className={shared.error} role="alert">
                {state.phoneError}
              </div>
            )}
            <div className={shared.actions}>
              <button
                className={joinClassNames(shared.darkButton, shared.focusRing)}
                data-ac-in="1"
                onClick={() => void login.savePhone()}
              >
                Save
              </button>
              <button
                className={joinClassNames(styles.cancel, shared.focusRing)}
                data-ac-in="1"
                onClick={() => setState({ phoneFlow: null, phoneError: "" })}
              >
                Cancel
              </button>
            </div>
          </div>
        </Reveal>
      </div>
    </SettingsSection>
  );
};

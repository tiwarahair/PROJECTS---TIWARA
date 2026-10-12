import type { ChangeEvent, ReactNode } from "react";
import { joinClassNames } from "../../utils/class-names";
import {
  getCloseReason,
  isEmailValid,
  isMobileValid,
} from "./account-settings-logic";
import type { AccountSettingsProps } from "./use-account-settings";
import type { AccountSettingsController } from "./use-account-settings";
import shared from "../../styles/components/account-settings/account-settings.module.css";
import styles from "../../styles/components/account-settings/settings-personal.module.css";

/** Section with the heading column on the left (wraps above on narrow containers). */
export const SettingsSection = ({
  label,
  heading,
  intro,
  className,
  children,
}: {
  label: string;
  heading: string;
  intro?: ReactNode;
  className?: string;
  children: ReactNode;
}) => (
  <section
    className={joinClassNames(shared.section, className)}
    data-screen-label={label}
  >
    <div className={shared.intro}>
      <h2 className={shared.heading}>{heading}</h2>
      {intro}
    </div>
    {children}
  </section>
);

export interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  error: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  className: string | undefined;
  type?: string;
  autoComplete?: string;
  showError?: boolean;
}

/** Label, input and error line. */
const TextField = ({
  id,
  label,
  value,
  error,
  onChange,
  className,
  type,
  autoComplete,
  showError = true,
}: TextFieldProps) => (
  <div>
    <label className={shared.label} htmlFor={id}>
      {label}
    </label>
    <input
      className={joinClassNames(
        className,
        shared.focusRing,
        error ? shared.fieldErr : shared.fieldOk,
      )}
      data-ac-in="1"
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      autoComplete={autoComplete}
      aria-invalid={error ? "true" : "false"}
    />
    {showError && !!error && (
      <div className={shared.error} role="alert">
        {error}
      </div>
    )}
  </div>
);

const Reveal = ({ open, children }: { open: boolean; children: ReactNode }) => (
  <div
    className={joinClassNames(
      styles.reveal,
      open ? styles.revealOpen : styles.revealClosed,
    )}
    data-ac-anim="1"
    aria-hidden={open ? "false" : "true"}
  >
    <div className={styles.revealInner}>{children}</div>
  </div>
);

const ArrowIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 12h14M13 6l6 6-6 6"></path>
  </svg>
);

export const InfoIcon = ({ className }: { className: string | undefined }) => (
  <svg
    className={className}
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
  >
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M12 11v5M12 7.5v.5"></path>
  </svg>
);

interface SettingsPersonalProps {
  settings: AccountSettingsController;
  uid: string;
  props: AccountSettingsProps;
}

export const SettingsPersonal = ({
  settings,
  uid,
  props,
}: SettingsPersonalProps) => {
  const { state, setState, toast, ask, getNameError } = settings;

  const emailErrors = {
    newEmail:
      state.emailTouched && !isEmailValid(state.newEmail)
        ? "Enter an email address, like name@example.co.uk."
        : "",
    password:
      state.emailTouched && !state.emailPassword
        ? "Enter your current password."
        : "",
  };

  const closeReason = getCloseReason(props.upcoming || 0, !!props.owed);
  const isPhoneCode = state.phoneFlow === "code";

  const phoneNext = () => {
    if (state.phoneFlow === "edit") {
      if (!isMobileValid(state.newPhone))
        return setState({
          phoneError: "Enter a UK mobile number, like 07700 900418.",
        });

      setState({ phoneFlow: "code", code: "", phoneError: "" });
      toast(`Code sent to ${state.newPhone}`);

      return;
    }

    if (!/^\d{6}$/.test(state.code))
      return setState({ phoneError: "Enter the 6-digit code." });

    if (state.code === "000000")
      return setState({
        phoneError:
          "That code didn’t match. Check the latest text and try again.",
      });

    setState({
      phone: state.newPhone,
      phoneFlow: null,
      newPhone: "",
      code: "",
      phoneError: "",
    });

    toast("Login phone updated");
  };

  const phoneClass = state.phoneError ? shared.fieldErr : shared.fieldOk;

  return (
    <>
      <SettingsSection label="Your name" heading="Your name">
        <div className={styles.nameCard}>
          {(
            [
              ["first", "First name", "given-name"],
              ["last", "Last name", "family-name"],
            ] as const
          ).map(([key, label, autoComplete]) => (
            <TextField
              key={key}
              id={`${uid}-${key}`}
              label={label}
              value={state[key]}
              error={getNameError(key)}
              onChange={(event) => setState({ [key]: event.target.value })}
              className={styles.input}
              autoComplete={autoComplete}
            />
          ))}
        </div>
      </SettingsSection>

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
              <ArrowIcon />
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
                className={joinClassNames(
                  shared.outlineButton,
                  shared.focusRing,
                )}
                data-ac-in="1"
                onClick={() =>
                  setState({
                    emailFlow: "edit",
                    newEmail: "",
                    emailPassword: "",
                    emailTouched: false,
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
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2"></path>
                </svg>
                Pending verification
              </div>
              <p className={styles.pendingText}>
                We sent a link to{" "}
                <strong className={styles.strong}>{state.pendingEmail}</strong>.
                Your login email changes once you open it.
              </p>
              <div className={styles.pendingActions}>
                <button
                  className={joinClassNames(styles.resend, shared.focusRing)}
                  data-ac-in="1"
                  onClick={() => toast("Link sent again")}
                >
                  Resend link
                </button>
                <button
                  className={joinClassNames(
                    styles.cancelChange,
                    shared.focusRing,
                  )}
                  data-ac-in="1"
                  onClick={() => {
                    setState({ pendingEmail: "" });
                    toast("Email change cancelled");
                  }}
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
                error={emailErrors.newEmail}
                onChange={(event) => setState({ newEmail: event.target.value })}
                className={styles.input}
              />
              <TextField
                id={`${uid}-epw`}
                label="Current password"
                type="password"
                autoComplete="current-password"
                value={state.emailPassword}
                error={emailErrors.password}
                onChange={(event) =>
                  setState({ emailPassword: event.target.value })
                }
                className={styles.input}
              />
              <div className={styles.formActions}>
                <button
                  className={joinClassNames(
                    shared.darkButton,
                    shared.focusRing,
                  )}
                  data-ac-in="1"
                  onClick={() => {
                    if (!isEmailValid(state.newEmail) || !state.emailPassword)
                      return setState({ emailTouched: true });

                    setState({
                      emailFlow: null,
                      pendingEmail: state.newEmail.trim(),
                      emailPassword: "",
                    });

                    toast("Verification link sent");
                  }}
                >
                  Send verification link
                </button>
                <button
                  className={joinClassNames(styles.cancel, shared.focusRing)}
                  data-ac-in="1"
                  onClick={() =>
                    setState({ emailFlow: null, emailTouched: false })
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
              <div className={shared.rowLabel}>Login phone</div>
              <div className={styles.phoneValue}>{state.phone}</div>
            </div>
            {!state.phoneFlow && (
              <button
                className={joinClassNames(
                  shared.outlineButton,
                  shared.focusRing,
                )}
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
              {!isPhoneCode && (
                <>
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
                  <div className={shared.help}>
                    We’ll text a 6-digit code to this number.
                  </div>
                </>
              )}
              {isPhoneCode && (
                <>
                  <label className={shared.label} htmlFor={`${uid}-code`}>
                    {`Enter the code sent to ${state.newPhone}`}
                  </label>
                  <input
                    className={joinClassNames(
                      styles.codeInput,
                      shared.focusRing,
                      phoneClass,
                    )}
                    data-ac-in="1"
                    id={`${uid}-code`}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={state.code}
                    onChange={(event) =>
                      setState({
                        code: event.target.value.replace(/\D/g, "").slice(0, 6),
                        phoneError: "",
                      })
                    }
                    aria-invalid={state.phoneError ? "true" : "false"}
                  />
                </>
              )}
              {!!state.phoneError && (
                <div className={shared.error} role="alert">
                  {state.phoneError}
                </div>
              )}
              <div className={shared.actions}>
                <button
                  className={joinClassNames(
                    shared.darkButton,
                    shared.focusRing,
                  )}
                  data-ac-in="1"
                  onClick={phoneNext}
                >
                  {isPhoneCode ? "Verify" : "Send code"}
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

      <SettingsSection
        label="Close account"
        heading="Close account"
        className={styles.closeSection}
      >
        <div className={styles.closeCard}>
          <p className={styles.closeText}>
            Removes your booking page and deletes your personal details. Payment
            records are kept for tax purposes.
          </p>
          {!!closeReason && (
            <div className={styles.closeReason}>
              <InfoIcon className={shared.infoIcon} />
              {closeReason}
            </div>
          )}
          <button
            className={joinClassNames(
              styles.closeButton,
              shared.focusRing,
              closeReason ? styles.closeBlocked : styles.closeOpen,
            )}
            data-ac-in="1"
            disabled={!!closeReason}
            onClick={() =>
              ask(
                {
                  title: "Close your account?",
                  body: "Your booking page will be removed and your personal details deleted. Payment records are kept for tax purposes. This can’t be undone.",
                  cta: "Close account",
                },
                () => toast("Account closed"),
              )
            }
          >
            Close account
          </button>
        </div>
      </SettingsSection>
    </>
  );
};

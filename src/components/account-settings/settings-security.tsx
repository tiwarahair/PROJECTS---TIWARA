import { joinClassNames } from "../../utils/class-names";
import { PasswordMeter } from "../password-meter/password-meter";
import { SESSION_ICONS } from "./account-settings-logic";
import type { AccountSettingsProps } from "./use-account-settings";
import type { AccountSettingsController } from "./use-account-settings";
import { SettingsSection } from "./settings-personal";
import shared from "./account-settings.module.css";
import styles from "./settings-security.module.css";

const TickPath = () => <path d="M5 12.5l4.5 4.5L19 7.5"></path>;

/** Checkbox row (prototype role=checkbox buttons). */
export const CheckRow = ({
  isOn,
  onToggle,
  children,
}: {
  isOn: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) => (
  <button
    className={joinClassNames(shared.checkRow, shared.focusRing)}
    data-ac-in="1"
    role="checkbox"
    aria-checked={isOn ? "true" : "false"}
    onClick={onToggle}
  >
    <span
      className={joinClassNames(
        shared.checkBox,
        isOn ? shared.checkOn : shared.checkOff,
      )}
    >
      <svg
        className={joinClassNames(
          shared.checkTick,
          isOn ? shared.tickOn : shared.tickOff,
        )}
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#fffefb"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <TickPath />
      </svg>
    </span>
    {children}
  </button>
);

/** On / off switch (prototype sw()). */
export const Switch = ({
  isOn,
  label,
  onToggle,
  className,
}: {
  isOn: boolean;
  label: string;
  onToggle: () => void;
  className: string | undefined;
}) => (
  <button
    className={joinClassNames(className, shared.focusRing)}
    data-ac-in="1"
    role="switch"
    aria-checked={isOn ? "true" : "false"}
    aria-label={label}
    onClick={onToggle}
  >
    <span
      className={joinClassNames(
        shared.switchTrack,
        isOn ? shared.trackOn : shared.trackOff,
      )}
    >
      <span
        className={joinClassNames(
          shared.switchKnob,
          isOn ? shared.knobOn : shared.knobOff,
        )}
      ></span>
    </span>
  </button>
);

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
    toast,
    ask,
    isSocial,
    showPasswordFields,
    passwordView,
    passwordErrors,
  } = settings;
  const provider = props.signIn === "apple" ? "Apple" : "Google";
  const setPassword = (key: "cur" | "nw" | "conf", value: string) =>
    setState(({ pw }) => ({ pw: { ...pw, [key]: value } }));
  const tfaDevices = Array.isArray(props.tfaDevices)
    ? props.tfaDevices
    : state.tfaDevs;
  const isTfaOn = tfaDevices.length > 0;
  const hasOthers = state.sessions.some(({ cur }) => !cur);
  const passwordFields = [
    ...(isSocial
      ? []
      : [
          {
            key: "cur" as const,
            label: "Current password",
            autoComplete: "current-password",
            error: passwordErrors.cur,
          },
        ]),
    {
      key: "nw" as const,
      label: "New password",
      autoComplete: "new-password",
      error: passwordErrors.nw,
    },
    {
      key: "conf" as const,
      label: "Confirm new password",
      autoComplete: "new-password",
      error: passwordErrors.conf,
    },
  ];

  return (
    <>
      <SettingsSection label="Password" heading="Password">
        <div className={shared.card}>
          {isSocial && !state.setPw && (
            <div className={styles.socialIntro}>
              <p className={styles.socialText}>
                {"You sign in with " +
                  provider +
                  ". Set a password to also sign in with email."}
              </p>
              <button
                className={joinClassNames(styles.setPassword, shared.focusRing)}
                data-ac-in="1"
                onClick={() => setState({ setPw: true })}
              >
                Set password
              </button>
            </div>
          )}
          {showPasswordFields && (
            <div className={styles.pwFields}>
              {passwordFields.map(({ key, label, autoComplete, error }) => {
                const id = uid + "-p" + { cur: "c", nw: "n", conf: "f" }[key];
                const isNew = key === "nw";
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
                      value={state.pw[key]}
                      onChange={(event) => setPassword(key, event.target.value)}
                      onBlur={() => {
                        if (isNew && state.pw.nw) setState({ pwNwBlur: true });
                      }}
                      autoComplete={autoComplete}
                      aria-invalid={error ? "true" : "false"}
                      aria-describedby={isNew ? id + "-hint" : ""}
                    />
                    {/* the new password's error shows in the meter, not as a line */}
                    {!isNew && !!error && (
                      <div className={shared.error} role="alert">
                        {error}
                      </div>
                    )}
                    {isNew && (
                      <PasswordMeter id={id + "-hint"} view={passwordView} />
                    )}
                  </div>
                );
              })}
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

      <SettingsSection
        label="Two-factor authentication"
        heading="Two-factor authentication"
        intro={
          <p className={shared.introText}>
            A second step when you sign in, so only you can get into your
            account.
          </p>
        }
      >
        <div className={styles.listCard}>
          <div className={styles.listRow}>
            <div className={shared.rowText}>
              <div className={styles.listTitle}>Two-step verification</div>
              {!isTfaOn && <div className={styles.tfaOff}>Off · Required</div>}
              {isTfaOn && (
                <div className={styles.tfaOn}>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <TickPath />
                  </svg>
                  On
                </div>
              )}
            </div>
            {!isTfaOn && (
              <button
                className={joinClassNames(styles.turnOn, shared.focusRing)}
                data-ac-in="1"
                onClick={() => {
                  if (props.onTfaTurnOn) return props.onTfaTurnOn();
                  setState({
                    tfaDevs: [{ name: "Main phone", backup: false }],
                  });
                  toast("Two-step verification is on");
                }}
              >
                Turn on
              </button>
            )}
          </div>
          {tfaDevices.map((device, index) => (
            <div key={"d" + index} className={styles.listRow}>
              <div className={shared.rowText}>
                <div className={styles.listTitle}>{device.name}</div>
                <div className={styles.listSub}>
                  {"Authenticator app" + (device.backup ? " · Backup" : "")}
                </div>
              </div>
              {tfaDevices.length > 1 && (
                <button
                  className={joinClassNames(
                    shared.outlineButton,
                    shared.focusRing,
                  )}
                  data-ac-in="1"
                  onClick={() => {
                    if (props.onTfaRemove)
                      return props.onTfaRemove(device.name);
                    setState({
                      tfaDevs: tfaDevices.filter((item) => item !== device),
                    });
                    toast(device.name + " removed");
                  }}
                  aria-label={"Remove " + device.name}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          {tfaDevices.length === 1 && (
            <div className={styles.listRow}>
              <div className={shared.rowText}>
                <div className={styles.listTitle}>Backup</div>
                <div className={styles.listSub}>None added</div>
              </div>
              <button
                className={joinClassNames(
                  shared.outlineButton,
                  shared.focusRing,
                )}
                data-ac-in="1"
                onClick={() => {
                  if (props.onTfaAddBackup) return props.onTfaAddBackup();
                  setState({
                    tfaDevs: tfaDevices.concat([
                      { name: "Backup phone", backup: true },
                    ]),
                  });
                  toast("Backup added");
                }}
              >
                Add backup
              </button>
            </div>
          )}
          <div className={styles.smsRow} aria-disabled="true">
            <div className={styles.smsText}>
              <span className={styles.listTitle}>Text message (SMS)</span>
              <span className={styles.soonTag}>Coming soon</span>
            </div>
          </div>
          {isTfaOn && !tfaDevices.some(({ backup }) => backup) && (
            <div className={styles.backupNote} role="note">
              <svg
                className={shared.infoIcon}
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--accent-500,#b5541f)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 9v4M12 17h.01"></path>
                <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"></path>
              </svg>
              Add a backup so you don’t get locked out.
            </div>
          )}
          <div className={styles.requiredNote}>
            <svg
              className={shared.infoIcon}
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
            Required to keep your account and payouts secure.
          </div>
          <div className={styles.codeNote}>
            <svg
              className={shared.infoIcon}
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 11v5M12 7.5v.5"></path>
            </svg>
            We’ll always email you a code when you sign in from a new device.
          </div>
        </div>
      </SettingsSection>

      <SettingsSection label="Active sessions" heading="Where you’re signed in">
        <div className={styles.listCard}>
          {state.sessLoading && (
            <div aria-busy="true" aria-label="Loading sessions">
              {[1, 2, 3].map((key) => (
                <div key={key} className={styles.skeletonRow}>
                  <span className={styles.skeletonIcon} data-ac-sk="1"></span>
                  <span className={styles.skeletonLines}>
                    <span className={styles.skeletonLong} data-ac-sk="1"></span>
                    <span
                      className={styles.skeletonShort}
                      data-ac-sk="1"
                    ></span>
                  </span>
                </div>
              ))}
            </div>
          )}
          {!state.sessLoading && (
            <>
              {state.sessions.map(({ id, device, loc, last, cur, kind }) => (
                <div key={id} className={styles.sessionRow}>
                  <span className={styles.sessionIcon}>
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d={SESSION_ICONS[kind]}></path>
                    </svg>
                  </span>
                  <div className={styles.sessionBody}>
                    <div className={styles.sessionMain}>
                      <div className={shared.badgeRow}>
                        <span className={shared.strongText}>{device}</span>
                        {cur && (
                          <span className={styles.currentTag}>Current</span>
                        )}
                      </div>
                      <div className={shared.rowLabel}>{loc}</div>
                    </div>
                    <div className={styles.sessionLast}>{last}</div>
                  </div>
                  {!cur && (
                    <button
                      className={joinClassNames(
                        styles.signOut,
                        shared.focusRing,
                      )}
                      data-ac-in="1"
                      onClick={() => {
                        setState(({ sessions }) => ({
                          sessions: sessions.filter((item) => item.id !== id),
                        }));
                        toast("Signed out of " + device.split(",")[0]);
                      }}
                      aria-label={"Sign out of " + device}
                      title="Sign out"
                    >
                      <svg
                        width="17"
                        height="17"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"></path>
                      </svg>
                    </button>
                  )}
                  {cur && <span className={styles.signOutSpacer}></span>}
                </div>
              ))}
              {!hasOthers && (
                <p className={styles.noOthers}>
                  No other devices are signed in.
                </p>
              )}
              <button
                className={joinClassNames(
                  styles.signOutAll,
                  shared.focusRing,
                  hasOthers ? styles.signOutAllOn : styles.signOutAllOff,
                )}
                data-ac-in="1"
                disabled={!hasOthers}
                onClick={() =>
                  ask(
                    {
                      title: "Sign out all other sessions?",
                      body: "Every device except this one will need to sign in again.",
                      cta: "Sign out",
                    },
                    () => {
                      setState(({ sessions }) => ({
                        sessions: sessions.filter(({ cur }) => cur),
                      }));
                      toast("Signed out of other sessions");
                    },
                  )
                }
              >
                Sign out all other sessions
              </button>
            </>
          )}
        </div>
      </SettingsSection>

      <SettingsSection label="Login alerts" heading="Login alerts">
        <div className={styles.alertsCard}>
          <span className={styles.alertsText}>
            Email me when someone signs in from a new device
          </span>
          <Switch
            isOn={state.alerts}
            label="Login alerts"
            className={styles.switchButton}
            onToggle={() => {
              setState({ alerts: !state.alerts });
              toast(state.alerts ? "Login alerts off" : "Login alerts on");
            }}
          />
        </div>
      </SettingsSection>
    </>
  );
};

import { LogOut } from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import { SESSION_ICONS } from "./logic";
import { SettingsSection, Switch } from "./fields";
import type { AccountSettingsController } from "./use-account-settings";
import shared from "../../styles/components/account-settings/index.module.css";
import styles from "../../styles/components/account-settings/sessions.module.css";

/** Settings → Security: where you're signed in, and login alerts. */
export const SettingsSessions = ({
  settings,
}: {
  settings: AccountSettingsController;
}) => {
  const { state, ask, sessions } = settings;
  const hasOthers = state.sessions.some(({ isCurrent }) => !isCurrent);

  return (
    <>
      <SettingsSection label="Active sessions" heading="Where you’re signed in">
        <div className={styles.listCard}>
          {state.sessionsLoading && (
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
          {state.sessionsFailed && (
            <p className={styles.noOthers}>
              Your sessions couldn’t load. Open Security again to retry.
            </p>
          )}
          {!state.sessionsLoading && !state.sessionsFailed && (
            <>
              {state.sessions.map((session) => {
                const { id, device, signedIn, last, isCurrent, kind } = session;

                const SessionIcon = SESSION_ICONS[kind];

                return (
                  <div key={id} className={styles.sessionRow}>
                    <span className={styles.sessionIcon}>
                      <SessionIcon size={18} strokeWidth={1.7} />
                    </span>
                    <div className={styles.sessionBody}>
                      <div className={styles.sessionMain}>
                        <div className={shared.badgeRow}>
                          <span className={shared.strongText}>{device}</span>
                          {isCurrent && (
                            <span className={styles.currentTag}>Current</span>
                          )}
                        </div>
                        <div className={shared.rowLabel}>{signedIn}</div>
                      </div>
                      <div className={styles.sessionLast}>{last}</div>
                    </div>
                    {!isCurrent && (
                      <button
                        className={joinClassNames(
                          styles.signOut,
                          shared.focusRing,
                        )}
                        data-ac-in="1"
                        onClick={() => sessions.signOut(session)}
                        aria-label={`Sign out of ${device}`}
                        title="Sign out"
                      >
                        <LogOut size={17} strokeWidth={1.7} />
                      </button>
                    )}
                    {isCurrent && (
                      <span className={styles.signOutSpacer}></span>
                    )}
                  </div>
                );
              })}
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
                    sessions.signOutOthers,
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
          {state.alerts !== null && (
            <Switch
              isOn={state.alerts}
              label="Login alerts"
              className={styles.switchButton}
              onToggle={() => sessions.toggleAlerts(!state.alerts)}
            />
          )}
          {state.alerts === null && !state.sessionsFailed && (
            <span
              className={styles.skeletonSwitch}
              aria-busy="true"
              aria-label="Loading login alerts"
              data-ac-sk="1"
            ></span>
          )}
        </div>
      </SettingsSection>
    </>
  );
};

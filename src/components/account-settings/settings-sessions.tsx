import { joinClassNames } from "../../utils/class-names";
import { SESSION_ICONS } from "./account-settings-logic";
import { SettingsSection, Switch } from "./settings-fields";
import type { AccountSettingsController } from "./use-account-settings";
import shared from "../../styles/components/account-settings/account-settings.module.css";
import styles from "../../styles/components/account-settings/settings-sessions.module.css";

/** Settings → Security: where you're signed in, and login alerts. */
export const SettingsSessions = ({
  settings,
}: {
  settings: AccountSettingsController;
}) => {
  const { state, setState, toast, ask } = settings;
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
          {!state.sessionsLoading && (
            <>
              {state.sessions.map(
                ({ id, device, location, last, isCurrent, kind }) => (
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
                          {isCurrent && (
                            <span className={styles.currentTag}>Current</span>
                          )}
                        </div>
                        <div className={shared.rowLabel}>{location}</div>
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
                        onClick={() => {
                          setState(({ sessions }) => ({
                            sessions: sessions.filter((item) => item.id !== id),
                          }));

                          toast(`Signed out of ${device.split(",")[0]}`);
                        }}
                        aria-label={`Sign out of ${device}`}
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
                    {isCurrent && (
                      <span className={styles.signOutSpacer}></span>
                    )}
                  </div>
                ),
              )}
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
                        sessions: sessions.filter(({ isCurrent }) => isCurrent),
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

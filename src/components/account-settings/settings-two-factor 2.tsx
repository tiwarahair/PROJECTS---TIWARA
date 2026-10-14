import { joinClassNames } from "../../utils/class-names";
import { SettingsSection, TickPath } from "./settings-fields";
import type { AccountSettingsProps } from "./use-account-settings";
import type { AccountSettingsController } from "./use-account-settings";
import shared from "../../styles/components/account-settings/account-settings.module.css";
import styles from "../../styles/components/account-settings/settings-two-factor.module.css";

interface SettingsTwoFactorProps {
  settings: AccountSettingsController;
  props: AccountSettingsProps;
}

/** Settings → Security → two-step verification: the authenticator apps and backups. */
export const SettingsTwoFactor = ({
  settings,
  props,
}: SettingsTwoFactorProps) => {
  const { state, setState, toast } = settings;

  const twoFactorDevices = Array.isArray(props.twoFactorDevices)
    ? props.twoFactorDevices
    : state.twoFactorDevices;

  const isTwoFactorOn = twoFactorDevices.length > 0;

  return (
    <SettingsSection
      label="Two-factor authentication"
      heading="Two-factor authentication"
      intro={
        <p className={shared.introText}>
          A second step when you sign in, so only you can get into your account.
        </p>
      }
    >
      <div className={styles.listCard}>
        <div className={styles.listRow}>
          <div className={shared.rowText}>
            <div className={styles.listTitle}>Two-step verification</div>
            {!isTwoFactorOn && (
              <div className={styles.tfaOff}>Off · Required</div>
            )}
            {isTwoFactorOn && (
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
          {!isTwoFactorOn && (
            <button
              className={joinClassNames(styles.turnOn, shared.focusRing)}
              data-ac-in="1"
              onClick={() => {
                if (props.onTwoFactorTurnOn) return props.onTwoFactorTurnOn();

                setState({
                  twoFactorDevices: [{ name: "Main phone", backup: false }],
                });

                toast("Two-step verification is on");
              }}
            >
              Turn on
            </button>
          )}
        </div>
        {twoFactorDevices.map((device, index) => (
          <div key={`d${index}`} className={styles.listRow}>
            <div className={shared.rowText}>
              <div className={styles.listTitle}>{device.name}</div>
              <div className={styles.listSub}>
                {`Authenticator app${device.backup ? " · Backup" : ""}`}
              </div>
            </div>
            {twoFactorDevices.length > 1 && (
              <button
                className={joinClassNames(
                  shared.outlineButton,
                  shared.focusRing,
                )}
                data-ac-in="1"
                onClick={() => {
                  if (props.onTwoFactorRemove)
                    return props.onTwoFactorRemove(device.name);

                  setState({
                    twoFactorDevices: twoFactorDevices.filter(
                      (item) => item !== device,
                    ),
                  });

                  toast(`${device.name} removed`);
                }}
                aria-label={`Remove ${device.name}`}
              >
                Remove
              </button>
            )}
          </div>
        ))}
        {twoFactorDevices.length === 1 && (
          <div className={styles.listRow}>
            <div className={shared.rowText}>
              <div className={styles.listTitle}>Backup</div>
              <div className={styles.listSub}>None added</div>
            </div>
            <button
              className={joinClassNames(shared.outlineButton, shared.focusRing)}
              data-ac-in="1"
              onClick={() => {
                if (props.onTwoFactorAddBackup)
                  return props.onTwoFactorAddBackup();

                setState({
                  twoFactorDevices: twoFactorDevices.concat([
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
        {isTwoFactorOn && !twoFactorDevices.some(({ backup }) => backup) && (
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
  );
};

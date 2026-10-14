import { Check, Shield, TriangleAlert } from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import { SettingsSection } from "./settings-fields";
import type { AccountSettingsProps } from "./use-account-settings";
import shared from "../../styles/components/account-settings/account-settings.module.css";
import styles from "../../styles/components/account-settings/settings-two-factor.module.css";

interface SettingsTwoFactorProps {
  props: AccountSettingsProps;
}

/** Settings → Security → two-step verification: the authenticator apps and backups. */
export const SettingsTwoFactor = ({ props }: SettingsTwoFactorProps) => {
  const twoFactorDevices = props.twoFactorDevices ?? [];

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
                <Check size={14} strokeWidth={2.2} />
                On
              </div>
            )}
          </div>
          {!isTwoFactorOn && (
            <button
              className={joinClassNames(styles.turnOn, shared.focusRing)}
              data-ac-in="1"
              onClick={props.onTwoFactorTurnOn}
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
                onClick={() => props.onTwoFactorRemove?.(device.name)}
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
              onClick={props.onTwoFactorAddBackup}
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
            <TriangleAlert
              className={shared.infoIcon}
              size={15}
              color="var(--accent-500,#b5541f)"
              strokeWidth={1.8}
            />
            Add a backup so you don’t get locked out.
          </div>
        )}
        <div className={styles.requiredNote}>
          <Shield className={shared.infoIcon} size={15} strokeWidth={1.5} />
          Required to keep your account and payouts secure.
        </div>
      </div>
    </SettingsSection>
  );
};

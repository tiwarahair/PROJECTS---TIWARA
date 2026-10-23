import { KeyRound, Smartphone, TriangleAlert } from "lucide-react";
import { BackupOption, SmsRow } from "./fields";
import type { TwoFactorView } from "./view";
import styles from "../../../../styles/components/two-factor/index.module.css";

interface StepBackupProps {
  view: TwoFactorView;
}

/** Pick a backup (another device or a password manager), or skip after a warning. */
export const StepBackup = ({ view }: StepBackupProps) => (
  <>
    <div className={styles.radios} role="radiogroup" aria-label="Backup method">
      <BackupOption
        option={view.optionDevice}
        label="Another phone or tablet"
        icon={<Smartphone size={18} strokeWidth={1.7} />}
      />
      <BackupOption
        option={view.optionManager}
        label="A password manager"
        icon={<KeyRound size={18} strokeWidth={1.7} />}
      />
      <SmsRow />
    </div>
    {view.isSkipWarn && (
      <div className={styles.warn} role="alert">
        <TriangleAlert
          className={styles.warnIcon}
          size={16}
          strokeWidth={1.8}
          color="var(--accent-500,#b5541f)"
        />
        <span>
          Without a backup, you’ll need to contact support if you lose your
          phone.
        </span>
      </div>
    )}
    <button className={styles.primary} onClick={view.addBackup}>
      Add backup
    </button>
    {view.isSkipShown && (
      <button className={styles.skip} onClick={view.skip}>
        {view.skipLabel}
      </button>
    )}
  </>
);

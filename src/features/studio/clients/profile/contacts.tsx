import type { Profile } from ".";
import styles from "../../../../styles/features/studio/clients/profile/contacts.module.css";
import shared from "../../../../styles/features/studio/clients/profile/index.module.css";

interface ProfileContactsProps {
  profile: Profile;
}

export const ProfileContacts = ({ profile }: ProfileContactsProps) => (
  <div className={styles.contacts}>
    {profile.contacts.map(({ key, label, value, contactActions }) => (
      <div key={key} className={styles.contactRow}>
        <div className={shared.grow}>
          <div className={styles.label}>{label}</div>
          <div className={styles.value}>{value}</div>
        </div>
        {contactActions.map(
          ({ key: actionKey, label: actionLabel, href, icon: ActionIcon }) => (
            <a
              key={actionKey}
              className={styles.contactAction}
              href={href}
              aria-label={actionLabel}
              title={actionLabel}
            >
              <ActionIcon size={16} strokeWidth={1.7} />
            </a>
          ),
        )}
      </div>
    ))}
  </div>
);

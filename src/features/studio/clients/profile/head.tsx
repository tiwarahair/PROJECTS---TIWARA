import { Camera } from "lucide-react";
import type { ClientsView } from "../view";
import type { Profile } from ".";
import styles from "../../../../styles/features/studio/clients/profile/head.module.css";
import shared from "../../../../styles/features/studio/clients/profile/index.module.css";
import clientStyles from "../../../../styles/features/studio/clients/index.module.css";

interface ProfileHeadProps {
  view: ClientsView;
  profile: Profile;
}

export const ProfileHead = ({ view, profile }: ProfileHeadProps) => (
  <div className={styles.head}>
    <label className={styles.photo} title="Change photo">
      {profile.img ? (
        <img className={styles.avatar64} src={profile.img} alt="" />
      ) : (
        <span className={styles.initials64}>{profile.initials}</span>
      )}
      <span className={styles.photoHover} aria-hidden="true">
        <Camera size={20} strokeWidth={2} />
      </span>
      <span className={styles.photoBadge} aria-hidden="true">
        <Camera size={13} strokeWidth={1.5} />
      </span>
      <input
        className={styles.fileInput}
        type="file"
        accept="image/*"
        onChange={view.onPhoto}
        aria-label="Upload a photo"
      />
    </label>
    <div className={shared.grow}>
      <div className={styles.titleRow}>
        <h2 className={styles.h2}>{profile.name}</h2>
        {profile.isBlocked && (
          <span className={clientStyles.blocked}>Blocked</span>
        )}
      </div>
      <div className={styles.sub}>{profile.subtitle}</div>
      <div className={styles.subPlain}>{profile.lastVisit}</div>
    </div>
  </div>
);

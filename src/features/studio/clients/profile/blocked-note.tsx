import type { Profile } from ".";
import styles from "../../../../styles/features/studio/clients/profile/blocked-note.module.css";

interface BlockedNoteProps {
  profile: Profile;
}

export const BlockedNote = ({ profile }: BlockedNoteProps) => (
  <div className={styles.blockedNote}>
    <div className={styles.blockedText}>
      {`${profile.first} can't book online. You can still book them yourself.`}
    </div>
    {/* unblocking isn't wired up yet, so the button does nothing */}
    <button className={styles.textButton}>Unblock</button>
  </div>
);

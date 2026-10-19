import type { ClientsView } from "../view";
import type { Profile } from ".";
import styles from "../../../../styles/features/studio/clients/profile/blocked-note.module.css";

interface BlockedNoteProps {
  view: ClientsView;
  profile: Profile;
}

export const BlockedNote = ({ view, profile }: BlockedNoteProps) => (
  <div className={styles.blockedNote}>
    <div className={styles.blockedText}>
      {`${profile.first} can't book online. You can still book them yourself.`}
    </div>
    <button className={styles.textButton} onClick={view.unblockSelected}>
      Unblock
    </button>
  </div>
);

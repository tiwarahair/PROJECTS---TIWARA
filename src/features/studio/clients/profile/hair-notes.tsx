import type { ClientsView } from "../view";
import type { Profile } from ".";
import styles from "../../../../styles/features/studio/clients/profile/hair-notes.module.css";
import shared from "../../../../styles/features/studio/clients/profile/index.module.css";

interface HairNotesProps {
  view: ClientsView;
  profile: Profile;
}

export const HairNotes = ({ view, profile }: HairNotesProps) => (
  <>
    <div className={styles.sectionHead}>
      <div className={shared.h3}>Hair notes</div>
      <button className={styles.inlineLink} onClick={view.editSelected}>
        {profile.hairActionLabel}
      </button>
    </div>
    <div className={styles.private}>
      Private to you. Applies to every appointment.
    </div>
    {profile.products ? (
      <div className={styles.products}>{profile.products}</div>
    ) : (
      <div className={styles.noNotes}>
        {`Add anything to remember about ${profile.first}'s hair.`}
      </div>
    )}
  </>
);

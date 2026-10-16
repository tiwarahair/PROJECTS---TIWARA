import { Ellipsis } from "lucide-react";
import type { ClientsView } from "../view";
import type { Profile } from ".";
import styles from "../../../../styles/features/studio/clients/profile/actions.module.css";

interface ProfileActionsProps {
  view: ClientsView;
  profile: Profile;
}

export const ProfileActions = ({ view, profile }: ProfileActionsProps) => (
  <div className={styles.actions}>
    <button className={styles.book} onClick={view.bookSelected}>
      {`Book ${profile.first}`}
    </button>
    <button className={styles.edit} onClick={view.editSelected}>
      Edit
    </button>
    <button
      className={styles.more}
      onClick={view.moreSelected}
      aria-label="More actions"
    >
      <Ellipsis size={18} />
    </button>
  </div>
);

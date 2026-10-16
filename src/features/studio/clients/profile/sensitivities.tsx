import { TriangleAlert } from "lucide-react";
import type { ClientsView } from "../view";
import type { Profile } from ".";
import styles from "../../../../styles/features/studio/clients/profile/sensitivities.module.css";
import shared from "../../../../styles/features/studio/clients/profile/index.module.css";
import clientStyles from "../../../../styles/features/studio/clients/index.module.css";

interface SensitivityNoteProps {
  view: ClientsView;
  profile: Profile;
}

export const SensitivityNote = ({ view, profile }: SensitivityNoteProps) => (
  <div className={clientStyles.sensBox}>
    <TriangleAlert
      className={styles.sensIcon}
      size={18}
      strokeWidth={1.7}
      color="#b5541f"
    />
    <div className={shared.grow}>
      <div className={styles.sensLabel}>Allergy or sensitivity</div>
      <div className={styles.sensText}>{profile.sensitivities}</div>
    </div>
    <button className={styles.sensEdit} onClick={view.editSelected}>
      Edit
    </button>
  </div>
);

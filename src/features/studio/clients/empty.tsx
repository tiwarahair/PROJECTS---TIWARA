import type { ClientsView } from "./view";
import styles from "../../../styles/features/studio/clients/empty.module.css";

interface ClientsEmptyProps {
  view: ClientsView;
}

export const ClientsEmpty = ({ view }: ClientsEmptyProps) => (
  <div className={styles.empty}>
    <div className={styles.emptyTitle}>{view.emptyTitle}</div>
    <div className={styles.emptyBody}>{view.emptyBody}</div>
    <button className={styles.emptyAction} onClick={view.emptyGo}>
      {view.emptyAction}
    </button>
  </div>
);

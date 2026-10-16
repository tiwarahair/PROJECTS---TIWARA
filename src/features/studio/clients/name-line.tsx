import { TriangleAlert } from "lucide-react";
import type { ClientsView } from "./view";
import styles from "../../../styles/features/studio/clients/name-line.module.css";
import shared from "../../../styles/features/studio/clients/index.module.css";

interface NameLineProps {
  row: ClientsView["clientRows"][number];
}

export const NameLine = ({ row }: NameLineProps) => (
  <span className={styles.nameLine}>
    <span className={styles.name}>{row.name}</span>
    {row.hasSensitivities && (
      <span className={styles.sens} title="Has an allergy or sensitivity">
        <TriangleAlert size={14} strokeWidth={1.5} />
      </span>
    )}
    {row.isBlocked && <span className={shared.blocked}>Blocked</span>}
  </span>
);

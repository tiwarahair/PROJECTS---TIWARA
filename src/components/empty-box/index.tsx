import type { LucideIcon } from "lucide-react";
import styles from "../../styles/components/empty-box/index.module.css";

interface EmptyBoxProps {
  title: string;
  body: string;
  action: string;
  onAction: () => void;
  icon?: LucideIcon;
}

export const EmptyBox = ({
  title,
  body,
  action,
  onAction,
  icon: Icon,
}: EmptyBoxProps) => (
  <div className={styles.empty}>
    {Icon && <Icon size={28} strokeWidth={1.6} className={styles.emptyIcon} />}
    <div className={styles.emptyTitle}>{title}</div>
    <div className={styles.emptyBody}>{body}</div>
    <button type="button" className={styles.emptyAction} onClick={onAction}>
      {action}
    </button>
  </div>
);

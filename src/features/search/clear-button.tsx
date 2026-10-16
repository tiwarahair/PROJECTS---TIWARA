import { X } from "lucide-react";
import styles from "../../styles/features/search/search-nav.module.css";

interface ClearButtonProps {
  label: string;
  onClick: () => void;
  className?: string;
}

/** The small × inside the pill fields and the mobile search box. */
export const ClearButton = ({
  label,
  onClick,
  className,
}: ClearButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    className={className ?? styles.clearButton}
  >
    <X className={styles.iconBlock} size={12} strokeWidth={2.4} />
  </button>
);

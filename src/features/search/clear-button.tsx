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
    <svg
      className={styles.iconBlock}
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
    >
      <path d="M18 6 6 18M6 6l12 12"></path>
    </svg>
  </button>
);

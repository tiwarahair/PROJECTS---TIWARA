import styles from "../../../../styles/features/studio/bookings/steps/no-matches.module.css";

interface NoMatchesProps {
  title: string;
}

export const NoMatches = ({ title }: NoMatchesProps) => (
  <div className={styles.empty}>
    <div className={styles.emptyTitle}>{title}</div>
    <div className={styles.emptyBody}>Try a different search.</div>
  </div>
);

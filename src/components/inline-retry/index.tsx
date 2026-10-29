import { joinClassNames } from "../../utils/class-names";
import styles from "../../styles/components/inline-retry/index.module.css";

interface InlineRetryProps {
  text: string;
  onRetry: () => void;
  className?: string;
}

/** A small "didn't load · Try again" line for part of a page. */
export const InlineRetry = ({ text, onRetry, className }: InlineRetryProps) => (
  <p className={joinClassNames(styles.retryLine, className)} role="alert">
    {text}
    <button type="button" className={styles.retry} onClick={onRetry}>
      Try again
    </button>
  </p>
);

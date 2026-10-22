import { Copy } from "lucide-react";
import { useId } from "react";
import { getCalendarAppLinks, toWebcalUrl } from "../../utils/calendar-links";
import { CalendarAppPills } from "../calendar-app-pills";
import styles from "../../styles/components/calendar-subscribe/index.module.css";

interface CalendarSubscribeProps {
  feedUrl: string;
  isError: boolean;
  hint: string;
  onRetry: () => void;
  onCopy: (link: string) => void;
  onReset: () => void;
}

/** A private calendar feed: one-tap Apple, Google and Outlook subscribe pills, the link to copy, and a reset. */
export const CalendarSubscribe = ({
  feedUrl,
  isError,
  hint,
  onRetry,
  onCopy,
  onReset,
}: CalendarSubscribeProps) => {
  const inputId = useId();
  const link = toWebcalUrl(feedUrl);

  return (
    <div className={styles.box}>
      {!!feedUrl && (
        <div className={styles.apps}>
          <CalendarAppPills
            label="Add to"
            links={getCalendarAppLinks(feedUrl)}
          />
        </div>
      )}
      {isError && !feedUrl && (
        <div className={styles.failed} role="alert">
          <span className={styles.error}>
            Your calendar link couldn’t load.
          </span>
          <button className={styles.secondary} onClick={onRetry}>
            Try again
          </button>
        </div>
      )}
      <div className={styles.field}>
        <label className={styles.label} htmlFor={inputId}>
          Your calendar link
        </label>
        <input
          id={inputId}
          className={styles.input}
          readOnly={true}
          value={link}
          placeholder={isError ? "" : "Getting your link…"}
          onFocus={(event) => event.target.select()}
        />
      </div>
      <div className={styles.actions}>
        <button
          className={styles.copy}
          disabled={!feedUrl}
          onClick={() => onCopy(link)}
        >
          <Copy size={16} strokeWidth={1.7} />
          Copy calendar link
        </button>
        <button
          className={styles.secondary}
          disabled={!feedUrl}
          onClick={onReset}
        >
          Reset link
        </button>
      </div>
      <p className={styles.hint}>{hint}</p>
    </div>
  );
};

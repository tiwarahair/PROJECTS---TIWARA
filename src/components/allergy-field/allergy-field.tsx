import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { joinClassNames } from "../../utils/class-names";
import styles from "../../styles/components/allergy-field/allergy-field.module.css";

const MAX_LENGTH = 200;
const COUNTER_FROM = 150;

export interface AllergyFieldProps {
  stylistName?: string;
  value?: string;
  onChange?: (value: string) => void;
  /** Opens the "How we use it" privacy sheet on mount (boards). */
  openPrivacy?: boolean;
  autoFocus?: boolean;
}

const getNotice = (name: string) => [
  {
    key: "a",
    term: "What we keep",
    text: `Only what you type in this field, linked to your bookings with ${name}.`,
  },
  {
    key: "b",
    term: "Who sees it",
    text: `${name}, on your bookings. It isn’t shown to other stylists or on your reviews.`,
  },
  {
    key: "c",
    term: "Why",
    text: `So ${name} can choose products and methods that are safe for you.`,
  },
  {
    key: "d",
    term: "How long",
    text: "Until you remove it. Edit or remove it any time from your booking link or your account.",
  },
];

/** The allergy note opt-in field with a 200-char counter (from 150) and its privacy sheet. */
export const AllergyField = ({
  stylistName,
  value = "",
  onChange,
  openPrivacy = false,
  autoFocus = false,
}: AllergyFieldProps) => {
  const [uid] = useState(() => `al${Math.random().toString(36).slice(2, 7)}`);
  const [isSheetOpen, setSheetOpen] = useState(openPrivacy);

  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1200,
  );

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const name = stylistName || "your stylist";
  const length = value.length;

  const ids = {
    field: `${uid}-f`,
    hint: `${uid}-h`,
    count: `${uid}-c`,
    title: `${uid}-t`,
  };

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);

    window.addEventListener("resize", handleResize);

    if (autoFocus) textareaRef.current?.focus({ preventScroll: true });

    return () => window.removeEventListener("resize", handleResize);
    // autoFocus only applies on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // grow the textarea to its content, between 52px and 96px
  useLayoutEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight + 2, 52), 96)}px`;
  }, [value]);

  const closeSheet = () => setSheetOpen(false);

  return (
    <div data-screen-label="Allergies field" className={styles.root}>
      <div className={styles.field}>
        <label htmlFor={ids.field} className={styles.label}>
          Allergies or sensitivities
        </label>
        <div id={ids.hint} className={styles.hint}>
          e.g. sensitive scalp, allergic to certain products. Only {name} will
          see this.
        </div>
        <textarea
          id={ids.field}
          ref={textareaRef}
          className={styles.textarea}
          value={value}
          onChange={(event) =>
            onChange?.(event.target.value.slice(0, MAX_LENGTH))
          }
          rows={1}
          maxLength={MAX_LENGTH}
          aria-describedby={`${ids.hint} ${ids.count}`}
        ></textarea>
        {length >= COUNTER_FROM && (
          <div
            id={ids.count}
            aria-live="polite"
            className={joinClassNames(
              styles.count,
              length >= MAX_LENGTH && styles.countFull,
            )}
          >
            {length} / {MAX_LENGTH}
          </div>
        )}
        <p className={styles.consent}>
          By sharing this, you agree to Tiwára&apos;s House and {name} storing
          this health information to keep you safe.{" "}
          <button className={styles.link} onClick={() => setSheetOpen(true)}>
            How we use it
          </button>
        </p>
      </div>

      {isSheetOpen && (
        <div
          className={joinClassNames(
            styles.scrim,
            viewportWidth <= 960 && styles.mobile,
          )}
          onClick={closeSheet}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={ids.title}
            className={styles.dialog}
            onClick={(event) => event.stopPropagation()}
          >
            {viewportWidth <= 960 && (
              <div aria-hidden="true" className={styles.grab}></div>
            )}
            <div className={styles.header}>
              <div>
                <div className={styles.eyebrow}>Privacy</div>
                <h3 id={ids.title} className={styles.title}>
                  How we use your allergy information
                </h3>
              </div>
              <button
                className={styles.close}
                onClick={closeSheet}
                aria-label="Close"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M6 6l12 12M18 6L6 18"></path>
                </svg>
              </button>
            </div>
            <dl className={styles.notice}>
              {getNotice(name).map(({ key, term, text }) => (
                <div key={key} className={styles.noticeRow}>
                  <dt className={styles.noticeTerm}>{term}</dt>
                  <dd className={styles.noticeText}>{text}</dd>
                </div>
              ))}
            </dl>
            <p className={styles.footnote}>
              This is health information, so we only keep it with your consent.
              You can withdraw it at any time by removing it.
            </p>
            <button className={styles.done} onClick={closeSheet}>
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

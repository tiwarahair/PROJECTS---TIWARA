import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { joinClassNames } from "../../utils/class-names";
import { AllergyPrivacySheet } from "../allergy-privacy-sheet/allergy-privacy-sheet";
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

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const name = stylistName || "your stylist";
  const length = value.length;

  const ids = {
    field: `${uid}-f`,
    hint: `${uid}-h`,
    count: `${uid}-c`,
  };

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus({ preventScroll: true });
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
        <AllergyPrivacySheet stylistName={name} onClose={closeSheet} />
      )}
    </div>
  );
};

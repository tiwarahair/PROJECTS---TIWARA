import { useEffect, useId, useState } from "react";
import { X } from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import styles from "../../styles/components/allergy-privacy-sheet/index.module.css";

interface AllergyPrivacySheetProps {
  stylistName?: string;
  onClose: () => void;
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
    text: `${name.charAt(0).toUpperCase()}${name.slice(1)}, on your bookings. It isn’t shown to other stylists or on your reviews.`,
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

/** "How we use your allergy information": a centred dialog, or a bottom sheet on narrow screens. */
export const AllergyPrivacySheet = ({
  stylistName = "your stylist",
  onClose,
}: AllergyPrivacySheetProps) => {
  const titleId = useId();
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const isMobile = viewportWidth <= 960;

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div
      className={joinClassNames(styles.scrim, isMobile && styles.mobile)}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={styles.dialog}
        onClick={(event) => event.stopPropagation()}
      >
        {isMobile && <div aria-hidden="true" className={styles.grab}></div>}
        <div className={styles.header}>
          <div>
            <div className={styles.eyebrow}>Privacy</div>
            <h3 id={titleId} className={styles.title}>
              How we use your allergy information
            </h3>
          </div>
          <button className={styles.close} onClick={onClose} aria-label="Close">
            <X size={20} strokeWidth={2} />
          </button>
        </div>
        <dl className={styles.notice}>
          {getNotice(stylistName).map(({ key, term, text }) => (
            <div key={key} className={styles.noticeRow}>
              <dt className={styles.noticeTerm}>{term}</dt>
              <dd className={styles.noticeText}>{text}</dd>
            </div>
          ))}
        </dl>
        <p className={styles.footnote}>
          This is health information, so we only keep it with your consent. You
          can withdraw it at any time by removing it.
        </p>
        <button className={styles.done} onClick={onClose}>
          Got it
        </button>
      </div>
    </div>
  );
};

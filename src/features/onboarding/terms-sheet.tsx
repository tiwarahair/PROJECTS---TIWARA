import { joinClassNames } from "../../utils/class-names";
import { TERMS_BODY } from "./onboarding-data";
import type { TermsKind } from "./onboarding-state";
import styles from "./terms-sheet.module.css";

interface TermsSheetProps {
  kind: TermsKind;
  isDesktop: boolean;
  onClose: () => void;
}

const TITLES: Record<TermsKind, string> = {
  partner: "Partner Terms",
  client: "Client Terms",
  privacy: "Privacy Policy",
};

/** Partner / Client Terms or Privacy Policy: centred dialog on desktop, bottom sheet on mobile. */
export const TermsSheet = ({ kind, isDesktop, onClose }: TermsSheetProps) => (
  <>
    {/* the scrim closes the sheet */}
    {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
    <div onClick={onClose} className={styles.scrim}></div>
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ob-terms-t"
      className={joinClassNames(
        styles.sheet,
        isDesktop ? styles.sheetDesk : styles.sheetMobile,
      )}
    >
      <div className={styles.head}>
        <div className={styles.grow}>
          <div id="ob-terms-t" className={styles.title}>
            {TITLES[kind]}
          </div>
          <div className={styles.version}>Effective 1 September 2026</div>
        </div>
        <button onClick={onClose} aria-label="Close" className={styles.close}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M18 6 6 18M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      <div className={styles.body}>
        {TERMS_BODY[kind].map((text) => (
          <p key={text} className={styles.paragraph}>
            {text}
          </p>
        ))}
      </div>
    </div>
  </>
);

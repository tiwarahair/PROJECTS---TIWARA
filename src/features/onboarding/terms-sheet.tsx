import { X } from "lucide-react";
import { joinClassNames } from "../../utils/class-names";
import { TERMS_BODY } from "./data";
import type { TermsKind } from "./state";
import styles from "../../styles/features/onboarding/terms-sheet.module.css";

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
          <X size={20} strokeWidth={2} />
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

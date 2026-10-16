import { stylists } from "../../data";
import { formatMoney } from "../../utils/money";
import { policyLines } from "../../utils/pricing";
import { PREVIEW_PRICE, getPreviewPolicy } from "./summary";
import type { PolicyFormValues } from "./types";
import styles from "../../styles/components/payment-policy/preview.module.css";
import parts from "../../styles/components/payment-policy/parts.module.css";

const DEFAULT_STYLIST = stylists.find(({ id }) => id === "amara-beauty");

interface PreviewProps {
  policy: PolicyFormValues;
  stylistName: string | undefined;
}

export const Preview = ({ policy, stylistName }: PreviewProps) => {
  const preview = policyLines(
    getPreviewPolicy(policy),
    PREVIEW_PRICE,
    stylistName ?? DEFAULT_STYLIST?.name ?? "",
  );

  const notes = policy.extras
    .filter(({ text }) => text.trim())
    .map(({ text }) => text.trim());

  return (
    <aside className={styles.preview} data-screen-label="Client preview">
      <h2 className={parts.heading}>What clients will see</h2>
      <p className={parts.intro}>Example for a £100 service.</p>
      <div className={styles.previewCard} aria-live="polite">
        <div className={styles.dueRow}>
          <span className={styles.dueLabel}>Due today</span>
          <span className={styles.dueAmount}>
            {formatMoney(preview.dueToday)}
          </span>
        </div>
        <div className={styles.dividerTop}></div>
        <div className={styles.lines}>
          {preview.lines.map(({ icon: LineIcon, text }, index) => (
            <div key={index} className={styles.line}>
              <LineIcon
                className={styles.lineIcon}
                size={16}
                strokeWidth={1.7}
              />
              <span className={styles.lineText}>{text}</span>
            </div>
          ))}
        </div>
        {notes.length > 0 && (
          <>
            <div className={styles.dividerNotes}></div>
            <div className={styles.dueLabel}>From your stylist</div>
            <div className={styles.notes}>
              {notes.map((note, index) => (
                <div key={index} className={styles.noteText}>
                  {note}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </aside>
  );
};

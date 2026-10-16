import type { WizardView } from "./view";
import parts from "../../../../styles/features/studio/services/wizard/parts.module.css";
import styles from "../../../../styles/features/studio/services/wizard/review-step.module.css";

interface ReviewStepProps {
  view: WizardView;
}

/** Step 3 review: every bookable combination. */
export const ReviewStep = ({ view }: ReviewStepProps) => {
  const { review } = view;

  return (
    <>
      <div className={parts.intro}>
        Every bookable combination and what it will cost.
      </div>
      <div className={styles.reviewBox}>
        <div className={styles.reviewBase}>{review.baseLabel}</div>
        {review.isGrid && (
          <>
            <div className={styles.gridHead}>
              <div className={styles.corner}>{review.corner}</div>
              {review.head.map((label) => (
                <div key={label} className={styles.headCell}>
                  {label}
                </div>
              ))}
            </div>
            {review.rows.map(({ label, cells }) => (
              <div key={label} className={styles.gridRow}>
                <div className={styles.rowLabel}>{label}</div>
                {cells.map(({ price, duration }, index) => (
                  <div key={index} className={styles.cell}>
                    <div className={styles.amount}>{price}</div>
                    <div className={parts.unit}>{duration}</div>
                  </div>
                ))}
              </div>
            ))}
          </>
        )}
        {!review.isGrid &&
          review.items.map(({ label, price, duration }) => (
            <div key={label} className={styles.listRow}>
              <div className={styles.listLabel}>{label}</div>
              <div className={parts.muted135}>{duration}</div>
              <div className={styles.amount}>{price}</div>
            </div>
          ))}
      </div>
    </>
  );
};

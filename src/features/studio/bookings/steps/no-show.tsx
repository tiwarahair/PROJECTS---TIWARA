import { joinClassNames } from "../../../../utils/class-names";
import type { StudioController } from "../../core/use-studio";
import type { BookingSheetView } from "../sheet/view";
import styles from "../../../../styles/features/studio/bookings/steps/no-show.module.css";
import shared from "../../../../styles/features/studio/bookings/steps/index.module.css";

interface NoShowPanelProps {
  studio: StudioController;
  view: BookingSheetView;
}

/** "Didn't turn up?" under the body. */
export const NoShowPanel = ({ studio, view }: NoShowPanelProps) => (
  <div
    className={joinClassNames(
      styles.noShow,
      studio.isWide && styles.noShowWide,
    )}
  >
    <div className={styles.label145Block}>
      {view.booking.firstName} didn’t turn up?
    </div>
    <div className={styles.noShowHint}>
      Choose what to charge. The slot is released and you can undo this for 24
      hours from Past.
    </div>
    <div className={styles.radios}>
      {view.noShowOptions.map(({ id, label, subtitle, isOn, pick }) => (
        <button
          key={id}
          className={joinClassNames(styles.radio, isOn && styles.radioOn)}
          onClick={pick}
        >
          <span className={styles.ring}>
            <span className={styles.dot}></span>
          </span>
          <span className={shared.grow}>
            <span className={styles.radioLabel}>{label}</span>
            <span className={styles.radioSub}>{subtitle}</span>
          </span>
        </button>
      ))}
    </div>
    <div className={styles.noShowActions}>
      <button className={styles.back} onClick={view.backToView}>
        Back
      </button>
      <button className={styles.markNoShow} onClick={view.confirmNoShow}>
        Mark as no-show
      </button>
    </div>
  </div>
);

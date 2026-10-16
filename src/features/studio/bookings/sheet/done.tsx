import { Check } from "lucide-react";
import type { StudioController } from "../../core/use-studio";
import type { BookingSheetView } from "./view";
import styles from "../../../../styles/features/studio/bookings/sheet/done.module.css";

interface DoneStepProps {
  studio: StudioController;
  view: BookingSheetView;
}

export const DoneStep = ({ studio, view }: DoneStepProps) => (
  <div className={styles.done}>
    <div className={styles.doneIcon}>
      <Check size={26} strokeWidth={2.4} />
    </div>
    <div className={styles.doneTitle}>{view.doneTitle}</div>
    <div className={styles.doneBody}>{view.doneBody}</div>
    <button className={styles.rebook} onClick={view.rebook}>
      {`Rebook ${view.booking.firstName}`}
    </button>
    <button className={styles.doneButton} onClick={studio.actions.closeSheet}>
      Done
    </button>
  </div>
);

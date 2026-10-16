import { Plus } from "lucide-react";
import { joinClassNames } from "../../../../utils/class-names";
import styles from "../../../../styles/features/studio/bookings/steps/time-slots.module.css";

interface TimeSlot {
  key: string;
  label: string;
  isOn: boolean;
  pick: () => void;
}

interface TimeSlotsProps {
  times: TimeSlot[];
  isEmpty: boolean;
  emptyText: string;
  isCustom: boolean;
  toggleCustom: () => void;
}

export const TimeSlots = ({
  times,
  isEmpty,
  emptyText,
  isCustom,
  toggleCustom,
}: TimeSlotsProps) => (
  <>
    <div className={styles.timesLabel}>Available times</div>
    <div className={styles.times}>
      {isEmpty && <span className={styles.noSlots}>{emptyText}</span>}
      {times.map(({ key, label, isOn, pick }) => (
        <button
          key={key}
          className={joinClassNames(styles.time, isOn && styles.timeOn)}
          onClick={pick}
        >
          {label}
        </button>
      ))}
      <button
        className={joinClassNames(styles.custom, isCustom && styles.customOn)}
        onClick={toggleCustom}
      >
        <Plus size={13} strokeWidth={2} />
        Custom time
      </button>
    </div>
  </>
);

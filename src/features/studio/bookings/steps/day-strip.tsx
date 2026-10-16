import { joinClassNames } from "../../../../utils/class-names";
import styles from "../../../../styles/features/studio/bookings/steps/day-strip.module.css";

interface DayChip {
  key: number;
  weekday: string;
  dayNumber: number;
  isOn: boolean;
  pick: () => void;
}

interface DayStripProps {
  days: DayChip[];
}

export const DayStrip = ({ days }: DayStripProps) => (
  <div className={styles.dayStrip}>
    {days.map(({ key, weekday, dayNumber, isOn, pick }) => (
      <button
        key={key}
        className={joinClassNames(styles.dayChip, isOn && styles.dayChipOn)}
        onClick={pick}
      >
        <div className={styles.chipDow}>{weekday}</div>
        <div className={styles.chipNum}>{dayNumber}</div>
      </button>
    ))}
  </div>
);

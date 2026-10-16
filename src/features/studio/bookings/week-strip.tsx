import { joinClassNames } from "../../../utils/class-names";
import { asStyle } from "../../../utils/as-style";
import type { BookingsView } from "./view";
import styles from "../../../styles/features/studio/bookings/week-strip.module.css";
import shared from "../../../styles/features/studio/bookings/index.module.css";

interface WeekStripProps {
  view: BookingsView;
}

export const WeekStrip = ({ view }: WeekStripProps) => (
  <div
    className={styles.weekStrip}
    onTouchStart={view.swipeStart}
    onTouchEnd={view.swipeEnd}
  >
    {view.weekStrip.map(
      ({ key, weekday, dayNumber, isSelected, isToday, isPast, dot, pick }) => (
        <button
          key={key}
          className={styles.stripDay}
          onClick={pick}
          disabled={false}
        >
          <span
            className={joinClassNames(
              styles.stripDow,
              isPast ? styles.stripDowPast : isToday && styles.stripDowToday,
            )}
          >
            {weekday}
          </span>
          <span
            className={joinClassNames(
              styles.stripNum,
              isPast ? styles.stripNumPast : isToday && styles.stripNumToday,
              isSelected && styles.stripNumOn,
            )}
          >
            {dayNumber}
          </span>
          <span className={shared.dot} style={asStyle({ "--dot": dot })}></span>
        </button>
      ),
    )}
  </div>
);

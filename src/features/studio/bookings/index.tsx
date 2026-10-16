import { joinClassNames } from "../../../utils/class-names";
import type { StudioController } from "../core/use-studio";
import { DayView } from "./day-view";
import { EmptyCard } from "./empty-card";
import { BookingsHeader } from "./header";
import { BookingsList } from "./list";
import { getBookingsView } from "./view";
import type { BookingsView } from "./view";
import { WeekView } from "./week-view";
import styles from "../../../styles/features/studio/bookings/index.module.css";

interface StudioBookingsProps {
  studio: StudioController;
  view: BookingsView;
}

export const StudioBookings = ({ studio, view }: StudioBookingsProps) => {
  const { state, isWide, isDesktop, isNew } = studio;

  return (
    <div
      className={joinClassNames(
        styles.bookings,
        isWide && styles.wide,
        isDesktop && styles.desk,
      )}
      data-screen-label="Bookings"
    >
      <div className={styles.column}>
        <BookingsHeader studio={studio} view={view} />
        <div
          className={joinClassNames(
            styles.card,
            view.isCalendar && styles.cardCal,
          )}
        >
          {isNew && !state.calendarEmptyHidden && <EmptyCard studio={studio} />}
          {view.isCalendar &&
            (view.isWeek ? (
              <WeekView view={view} />
            ) : (
              <DayView studio={studio} view={view} />
            ))}
          {view.isList && <BookingsList view={view} />}
        </div>
      </div>
    </div>
  );
};

export { getBookingsView };

import { asStyle } from "../../../utils/as-style";
import { joinClassNames } from "../../../utils/class-names";
import type { StudioController } from "../core/use-studio";
import type { HomeView } from "./view";
import styles from "../../../styles/features/studio/home/upcoming.module.css";
import shared from "../../../styles/features/studio/home/index.module.css";

interface UpcomingPanelProps {
  studio: StudioController;
  view: HomeView;
}

export const UpcomingPanel = ({ studio, view }: UpcomingPanelProps) => {
  const { state, hasBookings, actions } = studio;

  return (
    <section
      className={joinClassNames(
        shared.upcoming,
        view.due.length > 0 && shared.upcomingSpan,
      )}
    >
      <div className={shared.panelHead}>
        <h2 className={shared.h2}>
          {state.range === "today"
            ? "Today's appointments"
            : "Upcoming appointments"}
        </h2>
        <button
          className={shared.textLink}
          onClick={() => actions.setCalendar({ tab: "bookings" })}
        >
          View all
        </button>
      </div>
      {view.upcoming.length === 0 && (
        <div className={styles.emptyCard}>
          <div className={styles.emptyCardTitle}>{view.emptyTitle}</div>
          <div className={styles.emptyCardBody}>
            {!hasBookings
              ? "Share your booking link to get your first one."
              : "Open a slot or share your link to fill it."}
          </div>
          <button className={styles.copyButton} onClick={view.copyLink}>
            Copy booking link
          </button>
        </div>
      )}
      <div className={styles.stack10}>
        {view.homeUpcoming.map((booking) => (
          <button
            key={booking.id}
            className={styles.upRow}
            // runtime: staggered entry
            style={asStyle({ "--delay": booking.delay })}
            onClick={booking.open}
          >
            <div className={styles.dateChip}>
              <div className={styles.dateDay}>{booking.dayShort}</div>
              <div className={styles.dateTime}>{booking.time}</div>
            </div>
            <img className={shared.avatar38} src={booking.imgSrc} alt="" />
            <div className={shared.grow}>
              <div className={styles.upName}>{booking.clientName}</div>
              <div className={styles.upMeta}>
                {`${booking.service} · ${booking.timeRange}`}
              </div>
            </div>
            <div className={styles.upPrice}>{booking.priceLabel}</div>
          </button>
        ))}
      </div>
    </section>
  );
};

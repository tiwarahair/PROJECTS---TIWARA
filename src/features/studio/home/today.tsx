import { asStyle } from "../../../utils/as-style";
import type { DecoratedBooking } from "../bookings/decorate";
import type { HomeView } from "./view";
import styles from "../../../styles/features/studio/home/today.module.css";
import shared from "../../../styles/features/studio/home/index.module.css";

const getTileStyle = (booking: DecoratedBooking) =>
  // runtime: the service category's tile colours and the booking's status tone
  asStyle({
    "--tile-line": booking.tileLine,
    "--tile-bg": booking.tileBackground,
    "--tile-bar": booking.tileBar,
    "--tile-text": booking.tileText,
    "--tile-meta": booking.tileMeta,
    "--st-bg": booking.statusBackground,
    "--st-color": booking.statusColor,
    "--st-border": booking.statusBorder,
  });

interface TodayPanelProps {
  view: HomeView;
}

export const TodayPanel = ({ view }: TodayPanelProps) => (
  <section className={shared.sidePanel} data-screen-label="Today">
    <div className={styles.todayPanel}>
      <div className={shared.panelHead}>
        <h2 className={shared.h2}>Today</h2>
        <button className={shared.textLink} onClick={view.goCalendarToday}>
          Calendar
        </button>
      </div>
      {view.today.length === 0 && (
        <div className={styles.dashed}>
          <div className={shared.emptyTitle}>Nothing booked today</div>
          <div className={styles.emptySub}>
            Open a slot or share your link to fill it.
          </div>
        </div>
      )}
      <div className={styles.stack8}>
        {view.today.map((booking) => (
          <button
            key={booking.id}
            className={styles.todayTile}
            style={getTileStyle(booking)}
            onClick={booking.open}
          >
            <img className={styles.tileAvatar} src={booking.imgSrc} alt="" />
            <span className={shared.grow}>
              <span className={styles.tileName}>{booking.clientName}</span>
              <span className={styles.tileMeta}>
                {`${booking.service} · ${booking.timeRange}`}
              </span>
            </span>
            <span className={styles.status}>{booking.statusLabel}</span>
          </button>
        ))}
      </div>
    </div>
  </section>
);

import { asStyle } from "../../../utils/as-style";
import type { DecoratedBooking } from "./decorate";
import styles from "../../../styles/features/studio/bookings/upcoming-row.module.css";
import shared from "../../../styles/features/studio/bookings/index.module.css";

interface UpcomingRowProps {
  booking: DecoratedBooking;
}

export const UpcomingRow = ({ booking }: UpcomingRowProps) => (
  <button
    className={shared.row}
    style={asStyle({
      "--delay": booking.delay,
      "--stripe": booking.stripe,
      "--badge-bg": booking.badgeBackground,
      "--badge-border": booking.badgeBorder,
      "--badge-color": booking.badgeColor,
    })}
    onClick={booking.open}
  >
    <div className={shared.stripe}></div>
    <div className={shared.times}>
      <div className={shared.start}>{booking.time}</div>
      <div className={shared.end}>{booking.endTime}</div>
    </div>
    <img className={shared.avatar} src={booking.imgSrc} alt="" />
    <div className={shared.grow}>
      <div className={shared.nameRow}>
        <span className={shared.name}>{booking.clientName}</span>
        {booking.badge && (
          <span className={styles.badge}>
            {booking.badgeDot && <span className={styles.pulse}></span>}
            {booking.badge}
          </span>
        )}
      </div>
      <div className={shared.service}>{booking.service}</div>
      {booking.subtitle && <div className={styles.sub}>{booking.subtitle}</div>}
    </div>
    <div className={shared.price}>{booking.priceLabel}</div>
  </button>
);

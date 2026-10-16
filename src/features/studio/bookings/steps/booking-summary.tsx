import type { BookingSheetView } from "../sheet/view";
import styles from "../../../../styles/features/studio/bookings/steps/booking-summary.module.css";
import shared from "../../../../styles/features/studio/bookings/steps/index.module.css";

interface BookingSummaryProps {
  view: BookingSheetView;
}

export const BookingSummary = ({ view }: BookingSummaryProps) => {
  const { booking } = view;

  return (
    <div className={styles.summary}>
      <img className={styles.avatar42} src={booking.imgSrc} alt="" />
      <div className={shared.grow}>
        <div className={styles.summaryName}>{booking.clientName}</div>
        <div className={styles.summaryMeta}>
          {`${booking.service} · ${booking.durationLabel}`}
        </div>
      </div>
      <div className={styles.summaryEnd}>
        <div className={styles.summaryTime}>{booking.timeRange}</div>
        <div className={shared.muted135}>{booking.dayLabel}</div>
      </div>
    </div>
  );
};

import { Calendar, MapPin } from "lucide-react";
import { getGoogleCalendarUrl } from "../../../supabase/functions/_shared/calendar-file";
import { CalendarAppPills } from "../../components/calendar-app-pills";
import { getCalendarFileUrl } from "../../lib/manage-booking-api";
import type { ManagedBooking } from "../../lib/manage-booking-api";
import { formatWhen, getOptionsLine, isCancelledStatus } from "./logic";
import styles from "../../styles/features/manage-booking/booking-card.module.css";
import { formatPence } from "../../utils/money";

interface BookingCardProps {
  booking: ManagedBooking;
}

export const BookingCard = ({ booking }: BookingCardProps) => {
  const isCancelled = isCancelledStatus(booking.status);
  const isUpcoming = booking.status === "confirmed" && booking.can_cancel;
  const optionsLine = getOptionsLine(booking);
  const { ref, stylist_name: stylist, starts_at: startsAt, where } = booking;

  const event = {
    ref,
    title: `${booking.snapshot.service_name} with ${stylist}`,
    startsAt,
    endsAt: booking.ends_at,
    location: where,
    description: `Booking ${ref}`,
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <div className={styles.service}>{booking.snapshot.service_name}</div>
        {isCancelled ? (
          <div className={styles.cancelled}>Cancelled</div>
        ) : (
          <div className={styles.total}>
            {formatPence(booking.price_pence + booking.fee_pence)}
          </div>
        )}
      </div>
      {!!optionsLine && <div className={styles.options}>{optionsLine}</div>}
      <div className={styles.facts}>
        <span className={styles.fact}>
          <Calendar size={15} strokeWidth={1.5} />
          {formatWhen(startsAt)}
        </span>
        <span className={styles.fact}>
          <MapPin size={15} strokeWidth={1.8} />
          {booking.is_mobile ? `${stylist} comes to you at ${where}` : where}
        </span>
      </div>
      {isUpcoming && (
        <div className={styles.calendar}>
          <CalendarAppPills
            label="Add to calendar"
            links={[
              {
                app: "apple",
                label: "Apple Calendar",
                href: getCalendarFileUrl({ key: booking.calendar_key }),
              },
              {
                app: "google",
                label: "Google Calendar",
                href: getGoogleCalendarUrl(event),
              },
            ]}
          />
        </div>
      )}
    </div>
  );
};

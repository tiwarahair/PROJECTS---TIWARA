import type { ManagedBooking } from "../../lib/manage-booking-api";
import styles from "../../styles/features/manage-booking/booking-notes.module.css";

/** What the client told the stylist when booking; hidden when they left no notes. */
export const BookingNotes = ({
  booking: { notes, address_notes: accessNotes, stylist_name: stylist },
}: {
  booking: ManagedBooking;
}) => {
  const rows = [
    ["Notes for your stylist", notes],
    ["Access notes", accessNotes],
  ].filter(([, text]) => !!text);

  if (!rows.length) return null;

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>{`Your notes for ${stylist}`}</h2>
      <div className={styles.rows}>
        {rows.map(([label, text]) => (
          <div key={label} className={styles.row}>
            <div className={styles.label}>{label}</div>
            <p className={styles.value}>{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

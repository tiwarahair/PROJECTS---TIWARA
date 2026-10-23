import { TriangleAlert } from "lucide-react";
import { joinClassNames } from "../../../utils/class-names";
import type { DecoratedBooking } from "../bookings/decorate";
import { STILL_SAVING } from "../bookings/sheet/checkout-view";
import type { StudioController } from "../core/use-studio";
import type { HomeView } from "./view";
import styles from "../../../styles/features/studio/home/due.module.css";
import shared from "../../../styles/features/studio/home/index.module.css";

const getDueLine = (booking: DecoratedBooking) => {
  const dayPrefix = booking.dayOffset < 0 ? `${booking.dayShort} ` : "";
  const endTime = booking.timeRange.split("–")[1] || booking.time;
  const dueNote = booking.due > 0 ? `£${booking.due} due` : "paid in full";

  return `${booking.service} · ended ${dayPrefix}${endTime} · ${dueNote}`;
};

interface DuePanelProps {
  studio: StudioController;
  view: HomeView;
}

export const DuePanel = ({ studio, view }: DuePanelProps) => {
  const { due } = view;
  const { openSheet, showToast } = studio.actions;

  const openCheckout = ({ id, remoteId }: DecoratedBooking) => {
    if (!remoteId) return showToast(STILL_SAVING);

    openSheet("booking", { sheetBookingId: id, bookingStep: "checkout" });
  };

  return (
    <section className={shared.sidePanel} data-screen-label="Due for checkout">
      <div className={styles.duePanel}>
        <div className={styles.dueHead}>
          <h2 className={shared.h2}>Due for checkout</h2>
          <span className={styles.dueCount}>
            {due.length + (due.length === 1 ? " booking" : " bookings")}
          </span>
        </div>
        {due.map((booking, index) => (
          <div
            key={booking.id}
            className={joinClassNames(
              styles.dueRow,
              index === 0 && styles.dueRowFirst,
            )}
          >
            <button
              className={styles.dueOpen}
              onClick={() =>
                openSheet("booking", { sheetBookingId: booking.id })
              }
            >
              <img className={shared.avatar38} src={booking.imgSrc} alt="" />
              <span className={shared.grow}>
                <span className={styles.dueName}>{booking.clientName}</span>
                <span className={styles.dueMetaRow}>
                  {booking.unpaidFlag && (
                    <span className={styles.unpaid}>
                      <TriangleAlert size={12} strokeWidth={2} />
                      Unpaid
                    </span>
                  )}
                  <span className={styles.dueCount}>{getDueLine(booking)}</span>
                </span>
              </span>
            </button>
            <button
              className={styles.checkout}
              onClick={() => openCheckout(booking)}
            >
              Checkout
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};

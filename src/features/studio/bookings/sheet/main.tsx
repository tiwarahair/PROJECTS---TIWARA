import { Clock, ShieldOff, TriangleAlert } from "lucide-react";
import { joinClassNames } from "../../../../utils/class-names";
import type { StudioController } from "../../core/use-studio";
import type { EditServiceView } from "../edit-view";
import { ClientRow } from "./client-row";
import { LinkPanel } from "./link-panel";
import { LocationPanel } from "./location-panel";
import { OwnNote } from "./own-note";
import { ServiceCard } from "./service-card";
import { StatusRow } from "./status-row";
import type { BookingSheetView } from "./view";
import styles from "../../../../styles/features/studio/bookings/sheet/main.module.css";
import shared from "../../../../styles/features/studio/bookings/sheet/index.module.css";

interface BookingMainProps {
  studio: StudioController;
  view: BookingSheetView;
  edit: EditServiceView;
}

export const BookingMain = ({ studio, view, edit }: BookingMainProps) => {
  const { state } = studio;
  const { booking } = view;

  return (
    <>
      <div
        className={joinClassNames(
          styles.main,
          state.bookingStepBack && styles.mainBack,
        )}
      >
        <ClientRow studio={studio} view={view} />
        <StatusRow studio={studio} view={view} />
        {!!booking.note && (
          <figure className={styles.note}>
            <figcaption className={styles.noteCaption}>
              {`Note from ${booking.firstName}`}
            </figcaption>
            <blockquote className={styles.noteQuote}>
              {`“${booking.note}”`}
            </blockquote>
          </figure>
        )}
      </div>
      {!!view.hairNotes && (
        <figure className={styles.note}>
          <figcaption className={styles.noteCaption}>Hair notes</figcaption>
          <div className={styles.noteQuote}>{view.hairNotes}</div>
        </figure>
      )}
      {!!view.sensitivities && (
        <div className={styles.sens}>
          <TriangleAlert
            className={shared.noShrink}
            size={16}
            strokeWidth={1.7}
            color="#b5541f"
          />
          {view.sensitivities}
        </div>
      )}
      <ServiceCard studio={studio} view={view} edit={edit} />
      {booking.awaiting && (
        <div className={styles.awaiting}>
          <Clock
            className={shared.noShrink}
            size={17}
            strokeWidth={1.8}
            color="#6b5a10"
          />
          <div className={shared.grow}>
            <div className={styles.awaitingTitle}>
              {`Auto-cancels ${booking.expiryLabel}`}
            </div>
            <div className={styles.muted135}>{booking.hoursLeft}</div>
          </div>
        </div>
      )}
      {state.profile.mobile && <LocationPanel studio={studio} view={view} />}
      {booking.awaiting && <LinkPanel view={view} />}
      {booking.noProtect && (
        <div className={styles.noProtect}>
          <ShieldOff
            className={shared.menuIcon}
            size={16}
            strokeWidth={1.7}
            color="var(--text-secondary)"
          />
          <div className={styles.noProtectText}>
            <span className={shared.strong}>No booking protection.</span>
            {" Cancellation and no-show fees can't be charged."}
          </div>
        </div>
      )}
      <OwnNote studio={studio} view={view} />
    </>
  );
};

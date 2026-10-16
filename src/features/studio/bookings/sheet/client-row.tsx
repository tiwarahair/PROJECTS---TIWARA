import { ArrowRightLeft, ChevronRight, Trash } from "lucide-react";
import { joinClassNames } from "../../../../utils/class-names";
import type { StudioController } from "../../core/use-studio";
import { ContactLinks } from "./contact-links";
import type { BookingSheetView } from "./view";
import styles from "../../../../styles/features/studio/bookings/sheet/client-row.module.css";
import shared from "../../../../styles/features/studio/bookings/sheet/index.module.css";

interface ClientRowProps {
  studio: StudioController;
  view: BookingSheetView;
}

export const ClientRow = ({ studio, view }: ClientRowProps) => {
  const { state, setState } = studio;
  const { booking } = view;
  const isHovering = !!state.clientHover && view.isView;
  const hasClientActions = isHovering && !view.isClientLocked;

  return (
    <div
      className={shared.clientRow}
      onMouseEnter={() => setState({ clientHover: true })}
      onMouseLeave={() => setState({ clientHover: false })}
    >
      <div
        className={shared.clientOpen}
        role="button"
        tabIndex={0}
        onClick={view.openClient}
        aria-label="Open client profile"
      >
        <img className={shared.avatar52} src={booking.imgSrc} alt="" />
        <span className={shared.grow}>
          <span className={shared.clientName}>{booking.clientName}</span>
          <span className={shared.clientMeta}>
            {booking.visitLabel + booking.sinceLabel}
          </span>
        </span>
        {!hasClientActions && (
          <ContactLinks
            telHref={booking.telHref}
            smsHref={booking.smsHref}
            mailHref={booking.mailHref}
            hasPhone={booking.hasPhone}
            hasEmail={booking.hasEmail}
          />
        )}
        <ChevronRight
          className={shared.noShrink}
          size={18}
          strokeWidth={1.7}
          color="var(--neutral-500)"
        />
      </div>
      {hasClientActions && (
        <span className={styles.clientActions}>
          <button
            className={styles.roundButton}
            onClick={view.changeClient}
            aria-label="Change client"
          >
            <ArrowRightLeft size={16} strokeWidth={1.7} />
          </button>
          {!!booking.client && (
            <button
              className={joinClassNames(styles.roundButton, styles.roundDanger)}
              onClick={view.clearClient}
              aria-label="Make this a walk-in"
            >
              <Trash size={16} strokeWidth={1.7} />
            </button>
          )}
        </span>
      )}
    </div>
  );
};

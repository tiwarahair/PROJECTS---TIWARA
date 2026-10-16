import { PenLine } from "lucide-react";
import { joinClassNames } from "../../../../utils/class-names";
import type { StudioController } from "../../core/use-studio";
import type { EditServiceView } from "../edit-view";
import type { BookingSheetView } from "./view";
import styles from "../../../../styles/features/studio/bookings/sheet/service-card.module.css";
import shared from "../../../../styles/features/studio/bookings/sheet/index.module.css";

interface ServiceCardProps {
  studio: StudioController;
  view: BookingSheetView;
  edit: EditServiceView;
}

export const ServiceCard = ({ studio, view, edit }: ServiceCardProps) => {
  const { state, setState } = studio;
  const { booking } = view;
  const isServiceHover = !!state.serviceHover;

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      className={joinClassNames(
        styles.service,
        view.isView && styles.serviceClickable,
        isServiceHover && styles.serviceHover,
      )}
      onClick={() => {
        if (view.isView) studio.serviceActions.openAddonEdit(booking);
      }}
      onMouseEnter={() => setState({ serviceHover: true })}
      onMouseLeave={() => setState({ serviceHover: false })}
    >
      <div className={styles.serviceTop}>
        <div className={shared.grow}>
          <div className={styles.eyebrow}>{booking.categoryLabel}</div>
          <div className={styles.serviceName}>{booking.service}</div>
          <div className={styles.when}>
            {`${booking.dayLabel} · ${booking.timeRange}`}
          </div>
          <div className={styles.duration}>{booking.durationLabel}</div>
          {booking.movedByClient && (
            <div className={styles.moved}>
              {`Moved once by ${booking.firstName}. Free reschedule used.`}
            </div>
          )}
        </div>
        <div className={styles.priceCell}>
          <div className={styles.priceLayer}>
            <div className={styles.price}>{booking.priceLabel}</div>
            {view.isView && (
              <button
                className={styles.editLink}
                onClick={() => studio.serviceActions.openAddonEdit(booking)}
              >
                Edit
              </button>
            )}
          </div>
          {view.isView && (
            <div className={styles.iconLayer}>
              <button
                className={styles.editIcon}
                onClick={() => studio.serviceActions.openAddonEdit(booking)}
                aria-label="Edit service"
              >
                <PenLine size={16} strokeWidth={1.7} />
              </button>
            </div>
          )}
        </div>
      </div>
      {edit.bookingAddons.length > 0 && (
        <div className={styles.addons}>
          {edit.bookingAddons.map(({ key, name, meta }) => (
            <div key={key} className={styles.addonLine}>
              <span className={shared.primaryText}>{name}</span>
              <span className={styles.addonMeta}>{meta}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

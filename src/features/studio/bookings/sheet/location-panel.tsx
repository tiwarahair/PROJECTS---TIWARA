import { MapPin } from "lucide-react";
import { joinClassNames } from "../../../../utils/class-names";
import type { StudioController } from "../../core/use-studio";
import type { BookingSheetView } from "./view";
import styles from "../../../../styles/features/studio/bookings/sheet/location-panel.module.css";
import shared from "../../../../styles/features/studio/bookings/sheet/index.module.css";

interface LocationPanelProps {
  studio: StudioController;
  view: BookingSheetView;
}

export const LocationPanel = ({ studio, view }: LocationPanelProps) => {
  const { state, setState } = studio;
  const { booking } = view;

  const getLocationLabel = () => {
    if (state.bookingAddressOn) return "Save";

    return booking.address ? "Edit" : "Add";
  };

  return (
    <div className={shared.panel}>
      <MapPin
        className={shared.panelIcon}
        size={16}
        strokeWidth={1.7}
        color="var(--text-secondary)"
      />
      <div className={shared.grow}>
        <div className={shared.panelLabel}>Client location</div>
        {!state.bookingAddressOn && (
          <div
            className={joinClassNames(
              shared.panelValue,
              !booking.address && shared.panelValueEmpty,
            )}
          >
            {booking.addressLabel}
          </div>
        )}
        {state.bookingAddressOn && (
          <input
            className={styles.addressInput}
            value={state.bookingAddressDraft}
            onChange={(event) =>
              setState({ bookingAddressDraft: event.target.value })
            }
            placeholder="Street, postcode"
          />
        )}
      </div>
      <button className={styles.textAction} onClick={view.toggleLocation}>
        {getLocationLabel()}
      </button>
    </div>
  );
};

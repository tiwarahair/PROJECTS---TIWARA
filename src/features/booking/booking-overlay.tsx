import { useEffect, useRef } from "react";
import { cx } from "../../utils/class-names";
import { useAppDispatch, useAppSelector } from "../../stores/hooks";
import { bookingClosed } from "../../stores/overlays-slice";
import {
  getService,
  getIndividualService,
} from "../../data/service-categories";
import { TOTAL_BOOKING_STEPS } from "../../types/booking";
import { useBookingWizard } from "./use-booking-wizard";
import { StrandPreview } from "./strand-preview";
import { StepStyle } from "./step-style";
import { StepCustomise } from "./step-customise";
import { StepSchedule } from "./step-schedule";
import { StepDetails } from "./step-details";
import { StepReview } from "./step-review";
import { StepConfirm } from "./step-confirm";

/**
 * What the preview shows before a style is chosen. The original seeded the
 * panel from the markup and only overwrote the name once a style was picked,
 * so a Treatments booking opens showing Knotless Braids. Preserved.
 */
const PLACEHOLDER_STYLE_NAME = "Knotless Braids";
const PLACEHOLDER_STYLE_PRICE = "from £130";

export function BookingOverlay() {
  const dispatch = useAppDispatch();
  const { overlay, bookingSession } = useAppSelector((state) => state.overlays);
  const wizard = useBookingWizard(bookingSession);
  const { booking } = wizard;
  const optionsRef = useRef<HTMLDivElement>(null);

  // The options column scrolls back to the top on every step change.
  useEffect(() => {
    if (optionsRef.current) optionsRef.current.scrollTop = 0;
  }, [booking.step]);

  const { name } = getService(booking.categoryKey);
  const style = getIndividualService(booking.categoryKey, booking.styleId);

  // TO DO: This is a temporary close handler until we have a proper booking flow with a confirmation step. The original markup had a "Back" button that closed the overlay, so we preserve that behaviour for now.
  const close = () => dispatch(bookingClosed());

  return (
    <div
      id="bookingPage"
      className={cx("bp-overlay", overlay.booking && "open")}
    >
      <div className="bp-header">
        <button className="bp-back" onClick={close}>
          Back
        </button>
        <span className="bp-cat-name">{name}</span>
        <div className="bp-step-counter">
          <div className="bp-step-dots">
            {Array.from({ length: TOTAL_BOOKING_STEPS }, (_unused, index) => (
              <div
                key={index}
                className={cx(
                  "bp-step-dot",
                  index < booking.step && "done",
                  index === booking.step && "active",
                )}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="bp-body">
        {/* Every step panel stays mounted; `.bp-step-panel.active` shows one. */}
        <div className="bp-options" ref={optionsRef}>
          <div className={cx("bp-step-panel", booking.step === 0 && "active")}>
            <StepStyle
              serviceCategoryKey={booking.categoryKey}
              selectedStyleId={booking.styleId}
              onSelectStyle={wizard.selectStyle}
            />
          </div>

          <div className={cx("bp-step-panel", booking.step === 1 && "active")}>
            <StepCustomise
              serviceCategoryKey={booking.categoryKey}
              colourId={booking.colourId}
              lengthIndex={booking.lengthIndex}
              size={booking.size}
              addOnIds={booking.addOnIds}
              onSelectColour={wizard.selectColour}
              onSelectLength={wizard.selectLength}
              onSelectSize={wizard.selectSize}
              onToggleAddOn={wizard.toggleAddOn}
              onBack={wizard.goPrev}
              onNext={wizard.goNext}
            />
          </div>

          <div className={cx("bp-step-panel", booking.step === 2 && "active")}>
            <StepSchedule
              dayNumber={booking.dayNumber}
              timeSlotId={booking.timeSlotId}
              onSelectDay={wizard.selectDay}
              onSelectTime={wizard.selectTime}
              onBack={wizard.goPrev}
              onNext={wizard.goNext}
            />
          </div>

          <div className={cx("bp-step-panel", booking.step === 3 && "active")}>
            <StepDetails
              details={booking.details}
              onChange={wizard.updateDetails}
              onBack={wizard.goPrev}
              onNext={wizard.goNext}
            />
          </div>

          <div className={cx("bp-step-panel", booking.step === 4 && "active")}>
            <StepReview
              review={booking.review}
              stylistName={bookingSession.stylistName}
              onBack={wizard.goPrev}
              onNext={wizard.goNext}
            />
          </div>

          <div className={cx("bp-step-panel", booking.step === 5 && "active")}>
            <StepConfirm
              review={booking.review}
              stylistName={bookingSession.stylistName}
              onDone={close}
            />
          </div>
        </div>

        <StrandPreview
          styleId={booking.styleId}
          colourId={booking.colourId}
          lengthIndex={booking.lengthIndex}
          stylistName={bookingSession.stylistName}
          styleName={style?.name ?? PLACEHOLDER_STYLE_NAME}
          stylePrice={style?.price ?? PLACEHOLDER_STYLE_PRICE}
        />
      </div>
    </div>
  );
}

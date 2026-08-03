import { useEffect, useRef } from "react";
import { cx } from "../../utils/class-names";
import { useAppDispatch, useAppSelector } from "../../stores/hooks";
import { bookingClosed } from "../../stores/overlays-slice";
import { findStylist } from "../../data/stylists";
import { BOOKING_STEP } from "../../types/booking";
import { useBookingWizard } from "./use-booking-wizard";
import { StrandPreview } from "./strand-preview";
import { StepStyle } from "./step-style";
import { StepWhenWhere } from "./step-when-where";
import { StepStylist } from "./step-stylist";
import { StepCustomise } from "./step-customise";
import { StepSchedule } from "./step-schedule";
import { StepDetails } from "./step-details";
import { StepReview } from "./step-review";
import { StepConfirm } from "./step-confirm";
import { getIndividualService, getService } from "../../data/services/services";

export function BookingOverlay() {
  const dispatch = useAppDispatch();
  const { overlay, bookingSession } = useAppSelector((state) => state.overlays);
  const wizard = useBookingWizard(bookingSession);
  const { booking, review, sequence } = wizard;
  const optionsRef = useRef<HTMLDivElement>(null);

  // The options column scrolls back to the top on every step change.
  useEffect(() => {
    if (optionsRef.current) optionsRef.current.scrollTop = 0;
  }, [booking.step]);

  const { label } = getService(booking.categoryKey);
  const style = getIndividualService(booking.categoryKey, booking.styleId);

  // The stylist picked in step 2 wins; otherwise fall back to whoever the
  // booking was opened for (a profile or a search card).
  const stylistName =
    findStylist(booking.stylistId)?.name ?? bookingSession.stylistName;

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
        <span className="bp-cat-name">{label}</span>
        <div className="bp-step-counter">
          <div className="bp-step-dots">
            {/* One dot per step this booking will actually visit, so the
                shortened stylist flow shows six rather than eight. */}
            {sequence.map((step, index) => (
              <div
                key={step}
                className={cx(
                  "bp-step-dot",
                  index < sequence.indexOf(booking.step) && "done",
                  step === booking.step && "active",
                )}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="bp-body">
        {/* Every step panel stays mounted; `.bp-step-panel.active` shows one. */}
        <div className="bp-options" ref={optionsRef}>
          <div
            className={cx(
              "bp-step-panel",
              booking.step === BOOKING_STEP.style && "active",
            )}
          >
            <StepStyle
              serviceCategoryKey={booking.categoryKey}
              selectedStyleId={booking.styleId}
              onSelectStyle={wizard.selectStyle}
            />
          </div>

          <div
            className={cx(
              "bp-step-panel",
              booking.step === BOOKING_STEP.whenWhere && "active",
            )}
          >
            <StepWhenWhere
              dateFrom={booking.dateFrom}
              dateTo={booking.dateTo}
              location={booking.location}
              onDateRangeChange={wizard.setDateRange}
              onLocationChange={wizard.setLocation}
              onBack={wizard.goPrev}
              onNext={wizard.goNext}
            />
          </div>

          <div
            className={cx(
              "bp-step-panel",
              booking.step === BOOKING_STEP.stylist && "active",
            )}
          >
            <StepStylist
              serviceCategoryKey={booking.categoryKey}
              location={booking.location}
              dateFrom={booking.dateFrom}
              dateTo={booking.dateTo}
              selectedStylistId={booking.stylistId}
              onSelectStylist={wizard.selectStylist}
              onBack={wizard.goPrev}
            />
          </div>

          <div
            className={cx(
              "bp-step-panel",
              booking.step === BOOKING_STEP.customise && "active",
            )}
          >
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

          <div
            className={cx(
              "bp-step-panel",
              booking.step === BOOKING_STEP.schedule && "active",
            )}
          >
            <StepSchedule
              dayNumber={booking.dayNumber}
              timeSlotId={booking.timeSlotId}
              onSelectDay={wizard.selectDay}
              onSelectTime={wizard.selectTime}
              onBack={wizard.goPrev}
              onNext={wizard.goNext}
            />
          </div>

          <div
            className={cx(
              "bp-step-panel",
              booking.step === BOOKING_STEP.details && "active",
            )}
          >
            <StepDetails
              details={booking.details}
              onChange={wizard.updateDetails}
              onBack={wizard.goPrev}
              onNext={wizard.goNext}
            />
          </div>

          <div
            className={cx(
              "bp-step-panel",
              booking.step === BOOKING_STEP.review && "active",
            )}
          >
            <StepReview
              review={review}
              stylistName={stylistName}
              onBack={wizard.goPrev}
              onNext={wizard.goNext}
            />
          </div>

          <div
            className={cx(
              "bp-step-panel",
              booking.step === BOOKING_STEP.confirm && "active",
            )}
          >
            <StepConfirm
              review={review}
              stylistName={stylistName}
              onDone={close}
            />
          </div>
        </div>

        <StrandPreview
          styleId={booking.styleId}
          colourId={booking.colourId}
          lengthIndex={booking.lengthIndex}
          stylistName={stylistName}
          styleName={style?.label ?? ""}
          stylePrice={`from £${style?.defaultPrice ?? 0}`}
        />
      </div>
    </div>
  );
}

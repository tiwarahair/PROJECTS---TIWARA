import { useCallback, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { cx } from "../../utils/class-names";
import { findStylist, findStylistBySlug } from "../../data/stylists";
import { isOpen, useRouteSurfaces } from "../../hooks/use-route-surfaces";
import { useSurfaceNav } from "../../hooks/use-surface-nav";
import { bookingPath, stepFromPath } from "../../routes/routes";
import {
  BOOKING_STEP,
  FULL_SEQUENCE,
  STYLIST_KNOWN_SEQUENCE,
  type BookingStepIndex,
} from "../../types/booking";
import { DEFAULT_SERVICE_ID } from "../../data/services/services";
import type { ServiceId } from "../../types/services";
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

// TO DO: READ

const DEFAULT_STYLIST_NAME = "Tiwara's House";

export function BookingOverlay() {
  const surfaces = useRouteSurfaces();
  const { close } = useSurfaceNav();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { pathname } = useLocation();
  const optionsRef = useRef<HTMLDivElement>(null);

  const open = isOpen(surfaces, "booking");
  const service = (params.get("service") ?? DEFAULT_SERVICE_ID) as ServiceId;
  const contextStylist = findStylistBySlug(params.get("stylist") ?? undefined);
  const contextSlug = contextStylist?.slug;

  const context = useMemo(
    () => ({ categoryKey: service, stylistId: contextStylist?.id ?? null }),
    [service, contextStylist?.id],
  );

  const goToStep = useCallback(
    (next: BookingStepIndex) =>
      navigate(bookingPath(next, { service, stylist: contextSlug })),
    [navigate, service, contextSlug],
  );

  // Opening from a stylist drops two steps, so which slugs are valid depends
  // on how the booking started.
  const sequence = context.stylistId ? STYLIST_KNOWN_SEQUENCE : FULL_SEQUENCE;
  const requested = stepFromPath(pathname);
  const validStep =
    requested !== undefined && sequence.includes(requested)
      ? requested
      : undefined;

  // Bare `/book`, an unknown slug, or a step this sequence skips all fall back
  // to the start. Replaces rather than pushes, so Back does not bounce here.
  useEffect(() => {
    if (!open || validStep !== undefined) return;
    navigate(
      bookingPath(BOOKING_STEP.style, { service, stylist: contextSlug }),
      {
        replace: true,
      },
    );
  }, [open, validStep, navigate, service, contextSlug]);

  const wizard = useBookingWizard({
    context,
    step: validStep ?? BOOKING_STEP.style,
    open,
    goToStep,
  });
  const { booking, step, review } = wizard;

  // The options column scrolls back to the top on every step change.
  useEffect(() => {
    if (optionsRef.current) optionsRef.current.scrollTop = 0;
  }, [step]);

  const { label } = getService(booking.categoryKey);
  const style = getIndividualService(booking.categoryKey, booking.styleId);

  // The stylist picked in step 2 wins; otherwise fall back to whoever the
  // booking was opened for (a profile or a search card).
  const stylistName =
    findStylist(booking.stylistId)?.name ??
    contextStylist?.name ??
    DEFAULT_STYLIST_NAME;

  return (
    <div id="bookingPage" className={cx("bp-overlay", open && "open")}>
      <div className="bp-header">
        <button className="bp-back" onClick={close}>
          Back
        </button>
        <span className="bp-cat-name">{label}</span>
        <div className="bp-step-counter">
          <div className="bp-step-dots">
            {/* One dot per step this booking will actually visit, so the
                shortened stylist flow shows six rather than eight. */}
            {sequence.map((entry, index) => (
              <div
                key={entry}
                className={cx(
                  "bp-step-dot",
                  index < sequence.indexOf(step) && "done",
                  entry === step && "active",
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
              step === BOOKING_STEP.style && "active",
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
              step === BOOKING_STEP.whenWhere && "active",
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
              step === BOOKING_STEP.stylist && "active",
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
              step === BOOKING_STEP.customise && "active",
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
              step === BOOKING_STEP.schedule && "active",
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
              step === BOOKING_STEP.details && "active",
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
              step === BOOKING_STEP.review && "active",
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
              step === BOOKING_STEP.confirm && "active",
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
